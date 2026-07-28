import { Database } from "bun:sqlite";
// Experimental Bun entrypoint: `bun src/index.bun.ts`.
// Same relay as src/index.ts with the runtime bits swapped: bun:sqlite instead of
// better-sqlite3 (a V8-ABI addon Bun cannot load) and Bun.serve instead of @hono/node-server.
// WebSockets are handled by Bun.serve directly — hono's createBunWebSocket adapter adds
// ~1ms per message (828 vs 3000+ events/s in our benchmark); hono still serves the HTTP routes.
import * as schema from "@/database";
import { isEventMatchSomeFilters } from "@/nostr/isEventMatchSomeFilters";
import { verifyEvent } from "@/nostr/verifyEvent";
import { createRepository } from "@/repository";
import type { ClientToRelayPayload, Event, ReasonMessage, RelayToClientPayload, SubscriptionFilter } from "@/types/core";
import type { RelayInfomaion } from "@/types/nip11";
import { validateClientToRelayPayload } from "@/validators/validateClientToRelayPayload";
import { validateDeletionEvent } from "@/validators/validateDeletionEvent";
import { count, gt } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { uuidv7 } from "uuidv7";
import { config } from "./config";
import { isParameterizedReplaceableEvent, isReplaceableEvent, isTemporaryEvent } from "./nostr/utils";
import { IndexPage } from "./pages";

const { enableNIP26, limits } = config;

const infomation: RelayInfomaion = {
  name: config.relay.name,
  description: config.relay.description,
  pubkey: config.relay.pubkey,
  contact: config.relay.contact,
  supported_nips: [1, 2, 4, 9, 11, 45, ...(enableNIP26 ? [26] : [])],
  software: "Honostr",
  version: "0.0.0",
  limitation: {
    max_message_length: limits.maxMessageBytes,
    max_subscriptions: limits.maxSubscriptionsPerConnection,
    max_filters: limits.maxFiltersPerRequest,
    max_limit: limits.maxQueryLimit,
  },
};

const app = new Hono();

const sqlite = new Database(config.databasePath);
// WAL lets concurrent reads proceed while a write is in progress.
sqlite.exec("PRAGMA journal_mode = WAL");
// bun:sqlite defaults to synchronous=FULL (fsync per commit); better-sqlite3 ships with
// WAL-mode synchronous=NORMAL, so match it for the same durability and write cost.
sqlite.exec("PRAGMA synchronous = NORMAL");
sqlite.exec("PRAGMA busy_timeout = 5000");
// The bun-sqlite and better-sqlite3 drizzle drivers share the same sync query API.
const db = drizzle(sqlite, { schema }) as unknown as BetterSQLite3Database<typeof schema>;

// drizzle 0.30's blob-json decoder does JSON.parse(value.toString()) assuming a Node
// Buffer, but bun:sqlite returns BLOBs as plain Uint8Array whose toString() is not JSON.
const rawColumn = schema.events.raw;
const mapRawFromDriver = rawColumn.mapFromDriverValue.bind(rawColumn);
rawColumn.mapFromDriverValue = (value: unknown) => mapRawFromDriver(value instanceof Uint8Array ? Buffer.from(value) : value);

const repository = createRepository(db, { enableNIP26, maxQueryLimit: limits.maxQueryLimit });

// Minimal surface the relay logic needs from a socket; satisfied by Bun's ServerWebSocket.
type WS = { send: (data: string) => unknown };

type Subscription = {
  connectionId: string;
  subscriptionId: string;
  filters: SubscriptionFilter[];
  onMessage: (event: Event) => void;
};

let subscriptions: Subscription[] = [];

const removeSubscription = (connectionId: string, subscriptionId: string) => {
  subscriptions = subscriptions.filter(
    (subscription) => !(subscription.connectionId === connectionId && subscription.subscriptionId === subscriptionId),
  );
};

const wsSendPayload = async (ws: WS, payload: RelayToClientPayload) => ws.send(JSON.stringify(payload));

const broadcastEvent = (event: Event) => {
  for (const { onMessage, filters } of subscriptions) {
    if (isEventMatchSomeFilters(filters, event, { enableNIP26 })) onMessage(event);
  }
};

const processEvent = async (ws: WS, _connectionId: string, payload: ClientToRelayPayload<"EVENT">) => {
  const [_, event] = payload;
  const isValid = verifyEvent(event, { enableNIP26 });
  if (!isValid) return wsSendPayload(ws, ["OK", event.id, false, "invalid: event id or signature is invalid"]);

  try {
    const existingEvent = await repository.queryEventById(event.id);
    if (existingEvent) return wsSendPayload(ws, ["OK", event.id, false, "duplicate: event already exists"]);

    if (isReplaceableEvent(event)) await repository.saveReplaceableEvent(event);
    else if (isTemporaryEvent(event)) await repository.saveTemporaryEvent(event);
    else if (isParameterizedReplaceableEvent(event)) await repository.saveParameterizedReplaceableEvent(event);
    else if (event.kind === 5) {
      const result = validateDeletionEvent(event);
      if (!result.success) return wsSendPayload(ws, ["OK", event.id, false, "invalid: deletion event is invalid"]);
      await repository.deleteEventsByDeletionEvent(result.data);
      await repository.saveEvent(event);
    } else await repository.saveEvent(event);

    wsSendPayload(ws, ["OK", event.id, true, ""]);
    broadcastEvent(event);
  } catch (error) {
    let message = error instanceof Error ? error.message : "error: unknown error";
    message = message.includes(":") ? message : `error: ${message}`;
    wsSendPayload(ws, ["OK", event.id, false, message as ReasonMessage]);
  }
};

const processReq = async (ws: WS, connectionId: string, payload: ClientToRelayPayload<"REQ">) => {
  const [_, subscriptionId, ...filters] = payload;

  if (filters.length > limits.maxFiltersPerRequest) return wsSendPayload(ws, ["CLOSED", subscriptionId, "rate-limited: too many filters"]);

  // A REQ with an already used subscription id replaces the old subscription (NIP-01).
  removeSubscription(connectionId, subscriptionId);

  const connectionSubscriptions = subscriptions.filter((subscription) => subscription.connectionId === connectionId);
  if (connectionSubscriptions.length >= limits.maxSubscriptionsPerConnection)
    return wsSendPayload(ws, ["CLOSED", subscriptionId, "rate-limited: too many subscriptions"]);

  const onMessage = (event: Event) => wsSendPayload(ws, ["EVENT", subscriptionId, event]);
  subscriptions.push({ connectionId, subscriptionId, filters, onMessage });

  const events = await repository.queryEventsByFilters(filters);
  for (const event of events) wsSendPayload(ws, ["EVENT", subscriptionId, event]);
  wsSendPayload(ws, ["EOSE", subscriptionId]);
};

const processCount = async (ws: WS, _conId: string, payload: ClientToRelayPayload<"COUNT">) => {
  const [_, subscriptionId, ...filters] = payload;
  const count = await repository.countEventsByFilters(filters);
  wsSendPayload(ws, ["COUNT", subscriptionId, { count }]);
};

const closeSubscription = async (_ws: WS, conId: string, payload: ClientToRelayPayload<"CLOSE">) => {
  const [_, subscriptionId] = payload;
  removeSubscription(conId, subscriptionId);
};

app.all("/*", cors());

app.get("/", async (c) => {
  if (c.req.header("Accept") === "application/nostr+json") return c.json(infomation);

  const totalEvents = await db.select({ count: count() }).from(schema.events);
  const totalIndexedTags = await db.select({ count: count() }).from(schema.tags);
  const recentEvents = await db
    .select({ count: count() })
    .from(schema.events)
    .where(gt(schema.events.first_seen, new Date(Date.now() - 24 * 60 * 60 * 1000)));

  return c.html(IndexPage(totalEvents[0].count, totalIndexedTags[0].count, recentEvents[0].count));
});

type ConnData = { conId: string; windowStart: number; messageCount: number };

Bun.serve<ConnData>({
  port: config.port,
  fetch(req, server) {
    if (req.headers.get("upgrade")?.toLowerCase() === "websocket" && new URL(req.url).pathname === "/") {
      const data: ConnData = { conId: uuidv7(), windowStart: Date.now(), messageCount: 0 };
      if (server.upgrade(req, { data })) return;
    }
    return app.fetch(req, server);
  },
  websocket: {
    async message(ws, raw) {
      try {
        const data = String(raw);
        if (data.length > limits.maxMessageBytes) return wsSendPayload(ws, ["NOTICE", "invalid: message is too large"]);

        const conn = ws.data;
        if (Date.now() - conn.windowStart > 60_000) {
          conn.windowStart = Date.now();
          conn.messageCount = 0;
        }
        if (++conn.messageCount > limits.maxMessagesPerMinute) return wsSendPayload(ws, ["NOTICE", "rate-limited: slow down"]);

        let json: unknown;
        try {
          json = JSON.parse(data);
        } catch {
          return wsSendPayload(ws, ["NOTICE", "invalid: payload is not valid JSON"]);
        }
        const result = validateClientToRelayPayload(json);
        if (!result.success) return wsSendPayload(ws, ["NOTICE", "invalid: payload is invalid"]);

        const { data: payload } = result;
        if (payload[0] === "EVENT") await processEvent(ws, conn.conId, payload);
        if (payload[0] === "REQ") await processReq(ws, conn.conId, payload);
        if (payload[0] === "CLOSE") await closeSubscription(ws, conn.conId, payload);
        if (payload[0] === "COUNT") await processCount(ws, conn.conId, payload);
      } catch (e) {
        console.error("failed to process message", e);
      }
    },
    close(ws) {
      subscriptions = subscriptions.filter(({ connectionId }) => connectionId !== ws.data.conId);
    },
  },
});

console.log(`Server running at http://localhost:${config.port}`);
