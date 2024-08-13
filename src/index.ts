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
const port = 3000;

const sqlite = new Database("database.sqlite");
const db = drizzle(sqlite, { schema });
const repository = createRepository(db, { enableNIP26: true });

type Subscription = {
  subscriptionId: string;
  filters: SubscriptionFilter[];
  onMessage: (event: Event) => void;
};

const subscirptions = new Map<string, Subscription>();

const wsSendPayload = async (ws: WSContext, payload: RelayToClientPayload) => ws.send(JSON.stringify(payload));

const boradcastEvent = (event: Event) => {
  for (const { onMessage, filters } of subscirptions.values()) {
    if (isEventMatchSomeFilters(filters, event)) onMessage(event);
  }
};

const processEvent = async (ws: WSContext, payload: ClientToRelayPayload<"EVENT">) => {
  const [_, event] = payload;
  const isValid = verifyEvent(event);
  if (!isValid) return wsSendPayload(ws, ["OK", event.id, false, "invalid: event signature is invalid"]);

  const existingEvent = await repository.queryEventById(event.id);
  if (existingEvent) return wsSendPayload(ws, ["OK", event.id, false, "duplicate: event already exists"]);

  try {
    if (isReplaceableEvent(event)) await repository.saveReplaceableEvent(event);
    else if (isTemporaryEvent(event)) await repository.saveTemporaryEvent(event);
    else if (isParameterizedReplaceableEvent(event)) await repository.saveParameterizedReplaceableEvent(event);
    else if (event.kind === 5) {
      const result = validateDeletionEvent(event);
      if (!result.success) throw new Error("invalid: deletion event is invalid");
      await repository.deleteEventsByDeletionEvent(result.data);
      await repository.saveEvent(event);
    } else await repository.saveEvent(event);

    wsSendPayload(ws, ["OK", event.id, true, ""]);
  } catch (error) {
    let message = error instanceof Error ? error.message : "error: unknown error";
    message = message.includes(":") ? message : `error: ${message}`;
    wsSendPayload(ws, ["OK", event.id, false, message as ReasonMessage]);
  }

  boradcastEvent(event);
};

const processReq = async (ws: WSContext, payload: ClientToRelayPayload<"REQ">) => {
  const [_, subscriptionId, ...filters] = payload;

  const onMessage = (event: Event) => wsSendPayload(ws, ["EVENT", subscriptionId, event]);
  subscirptions.set(subscriptionId, { subscriptionId, filters, onMessage });

  const events = await repository.queryEventsByFilters(filters);
  for (const event of events) wsSendPayload(ws, ["EVENT", subscriptionId, event]);
  wsSendPayload(ws, ["EOSE", subscriptionId]);
};

const processCount = async (ws: WSContext, payload: ClientToRelayPayload<"COUNT">) => {
  const [_, subscriptionId, ...filters] = payload;
  const count = await repository.countEventsByFilters(filters);
  wsSendPayload(ws, ["COUNT", subscriptionId, { count }]);
};

const closeSubscription = async (_ws: WSContext, payload: ClientToRelayPayload<"CLOSE">) => {
  const [_, subscriptionId] = payload;
  subscirptions.delete(subscriptionId);
};

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.all("/*", cors());

app.get(
  "/",
  upgradeWebSocket(() => {
    return {
      onMessage(evt, ws) {
        try {
          const result = validateClientToRelayPayload(JSON.parse(evt.data as string));
          if (!result.success) return;

          const { data: payload } = result;
          if (payload[0] === "EVENT") processEvent(ws, payload);
          if (payload[0] === "REQ") processReq(ws, payload);
          if (payload[0] === "CLOSE") closeSubscription(ws, payload);
          if (payload[0] === "COUNT") processCount(ws, payload);
        } catch (e) {
          console.log("error", evt.data, e);
        }
      },
    };
  }),
  (c) => {
    if (c.req.header("Accept") === "application/nostr+json") return c.json(infomation);
    return c.text("Honostr Test Relay");
  },
);

const server = serve({ fetch: app.fetch, port });
injectWebSocket(server);

console.log(`Server running at http://localhost:${port}`);
