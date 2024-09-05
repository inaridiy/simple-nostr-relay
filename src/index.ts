import * as schema from "@/database";
import { isEventMatchSomeFilters } from "@/nostr/isEventMatchSomeFilters";
import { verifyEvent } from "@/nostr/verifyEvent";
import { createRepository } from "@/repository";
import type { ClientToRelayPayload, Event, ReasonMessage, RelayToClientPayload, SubscriptionFilter } from "@/types/core";
import type { RelayInfomaion } from "@/types/nip11";
import { validateClientToRelayPayload } from "@/validators/validateClientToRelayPayload";
import { validateDeletionEvent } from "@/validators/validateDeletionEvent";
import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { WSContext } from "hono/ws";
import { uuidv7 } from "uuidv7";
import { isParameterizedReplaceableEvent, isReplaceableEvent, isTemporaryEvent } from "./nostr/utils";

const infomation: RelayInfomaion = {
  name: "Honostr Test Relay",
  description: "Honostr Test Relay",
  pubkey: "36d931a0c3e540393015c9ba9df8718b6259bf36180c9c4ef230ecc135c59c52",
  contact: "inari@inaridiy.com",
  supported_nips: [1, 2, 4, 9, 11, 45, 26],
  software: "Honostr",
  version: "0.0.0",
};

const app = new Hono();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const sqlite = new Database("database.sqlite");
const db = drizzle(sqlite, { schema });
const repository = createRepository(db, { enableNIP26: true });

type Subscription = {
  connectionId: string;
  subscriptionId: string;
  filters: SubscriptionFilter[];
  onMessage: (event: Event) => void;
};

let subscirptions: Subscription[] = [];

const wsSendPayload = async (ws: WSContext, payload: RelayToClientPayload) => ws.send(JSON.stringify(payload));

const boradcastEvent = (event: Event) => {
  for (const { onMessage, filters } of subscirptions) {
    if (isEventMatchSomeFilters(filters, event)) onMessage(event);
  }
};

const processEvent = async (ws: WSContext, _connectionId: string, payload: ClientToRelayPayload<"EVENT">) => {
  console.debug("processEvent", payload);

  const [_, event] = payload;
  const isValid = verifyEvent(event);
  if (!isValid) {
    console.debug("error", payload, "invalid: event signature is invalid");
    return wsSendPayload(ws, ["OK", event.id, false, "invalid: event signature is invalid"]);
  }

  try {
    const existingEvent = await repository.queryEventById(event.id);
    if (existingEvent) {
      console.debug("error", payload, "duplicate: event already exists");
      return wsSendPayload(ws, ["OK", event.id, false, "duplicate: event already exists"]);
    }

    if (isReplaceableEvent(event)) await repository.saveReplaceableEvent(event);
    else if (isTemporaryEvent(event)) await repository.saveTemporaryEvent(event);
    else if (isParameterizedReplaceableEvent(event)) await repository.saveParameterizedReplaceableEvent(event);
    else if (event.kind === 5) {
      const result = validateDeletionEvent(event);
      if (!result.success) {
        console.debug("error", payload, result.errors);
        return wsSendPayload(ws, ["OK", event.id, false, "invalid: deletion event is invalid"]);
      }
      await repository.deleteEventsByDeletionEvent(result.data);
      await repository.saveEvent(event);
    } else await repository.saveEvent(event);

    wsSendPayload(ws, ["OK", event.id, true, ""]);
    boradcastEvent(event);
  } catch (error) {
    console.debug("error", payload, error);
    let message = error instanceof Error ? error.message : "error: unknown error";
    message = message.includes(":") ? message : `error: ${message}`;
    wsSendPayload(ws, ["OK", event.id, false, message as ReasonMessage]);
  }
};

const processReq = async (ws: WSContext, connectionId: string, payload: ClientToRelayPayload<"REQ">) => {
  try {
    const [_, subscriptionId, ...filters] = payload;

    const onMessage = (event: Event) => wsSendPayload(ws, ["EVENT", subscriptionId, event]);
    subscirptions.push({ connectionId, subscriptionId, filters, onMessage });

    const events = await repository.queryEventsByFilters(filters);
    for (const event of events) wsSendPayload(ws, ["EVENT", subscriptionId, event]);
    wsSendPayload(ws, ["EOSE", subscriptionId]);
  } catch (e) {
    console.log("error", e, payload);
  }
};

const processCount = async (ws: WSContext, _conId: string, payload: ClientToRelayPayload<"COUNT">) => {
  const [_, subscriptionId, ...filters] = payload;
  const count = await repository.countEventsByFilters(filters);
  wsSendPayload(ws, ["COUNT", subscriptionId, { count }]);
};

const closeSubscription = async (_ws: WSContext, conId: string, payload: ClientToRelayPayload<"CLOSE">) => {
  const [_, subscriptionId] = payload;
  subscirptions = subscirptions.filter(({ connectionId, subscriptionId: subId }) => subId !== subscriptionId && connectionId !== conId);
};

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.all("/*", cors());

app.get(
  "/",
  upgradeWebSocket(() => {
    const conId = uuidv7();
    console.log("onOpen", conId);

    return {
      onMessage(evt, ws) {
        try {
          const result = validateClientToRelayPayload(JSON.parse(evt.data as string));
          if (!result.success) return;

          const { data: payload } = result;
          if (payload[0] === "EVENT") processEvent(ws, conId, payload);
          if (payload[0] === "REQ") processReq(ws, conId, payload);
          if (payload[0] === "CLOSE") closeSubscription(ws, conId, payload);
          if (payload[0] === "COUNT") processCount(ws, conId, payload);
        } catch (e) {
          console.log("error", evt.data, e);
        }
      },
      onClose() {
        console.log("onClose", conId);
        subscirptions = subscirptions.filter(({ connectionId }) => connectionId !== conId);
      },
    };
  }),
  (c) => {
    if (c.req.header("Accept") === "application/nostr+json") return c.json(infomation);
    return c.text("Welcome to Simple Nostr Relay\nhttps://github.com/inaridiy/simple-nostr-relay");
  },
);

const server = serve({ fetch: app.fetch, port });
injectWebSocket(server);

console.log(`Server running at http://localhost:${port}`);
