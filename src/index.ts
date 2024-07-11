import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { WSContext } from "hono/ws";
import * as schema from "./database";
import { verifyEvent } from "./nostr/verifyEvent";
import { createRepository } from "./repository";
import { parseClientToRelayPayload } from "./schemas/core";
import type { ClientToRelayPayload, RelayToClientPayload } from "./types/core";

const app = new Hono();
const port = 3000;

const sqlite = new Database("database.sqlite");
const db = drizzle(sqlite, { schema });
const repository = createRepository(db);

const wsSendPayload = async (ws: WSContext, payload: RelayToClientPayload) => ws.send(JSON.stringify(payload));

const processEvent = async (ws: WSContext, payload: ClientToRelayPayload<"EVENT">) => {
  const [_, event] = payload;
  const isValid = verifyEvent(event);

  if (!isValid) return wsSendPayload(ws, ["OK", event.id, false, "invalid: event signature is invalid"]);

  const existingEvent = await repository.queryEventById(event.id);
  if (existingEvent) return wsSendPayload(ws, ["OK", event.id, false, "duplicate: event already exists"]);

  try {
    await repository.saveEvent(event);
    wsSendPayload(ws, ["OK", event.id, true, ""]);
  } catch (error) {
    if (error instanceof Error) wsSendPayload(ws, ["OK", event.id, false, `error: ${error.message}`]);
    else wsSendPayload(ws, ["OK", event.id, false, "error: unknown error"]);
  }
};

const processReq = async (ws: WSContext, payload: ClientToRelayPayload<"REQ">) => {
  const [_, subscriptionId, ...filters] = payload;
  const events = await repository.queryEventsByFilters(filters);
  console.log(events);
  for (const event of events) wsSendPayload(ws, ["EVENT", subscriptionId, event]);
};

const closeSubscription = async (ws: WSContext, payload: ClientToRelayPayload<"CLOSE">) => {};

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.all("/*", cors());

app.get("/ping", (c) => c.text("pong"));

app.get(
  "/",
  upgradeWebSocket(() => {
    return {
      onOpen: (ws) => {
        console.log("ws opened");
      },

      onMessage(evt, ws) {
        try {
          const payload = parseClientToRelayPayload(JSON.parse(evt.data as string));

          if (payload[0] === "EVENT") processEvent(ws, payload);
          if (payload[0] === "REQ") processReq(ws, payload);
          if (payload[0] === "CLOSE") closeSubscription(ws, payload);
        } catch (e) {
          console.log("error", e);
        }
      },
    };
  }),
);

const server = serve({ fetch: app.fetch, port });
injectWebSocket(server);

console.log(`Server running at http://localhost:${port}`);
