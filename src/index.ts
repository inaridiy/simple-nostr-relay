import * as schema from "@/database";
import { isEventMatchSomeFilters } from "@/nostr/isEventMatchSomeFilters";
import { verifyEvent } from "@/nostr/verifyEvent";
import { createRepository } from "@/repository";
import type { ClientToRelayPayload, Event, ReasonMessage, RelayToClientPayload, SubscriptionFilter } from "@/types/core";
import type { RelayInfomaion } from "@/types/nip11";
import { validateClientToRelayPayload } from "@/validators/validateClientToRelayPayload";
import { validateDeletionEvent } from "@/validators/validateDeletionEvent";
import { serve, upgradeWebSocket } from "@hono/node-server";
import Database from "better-sqlite3";
import { count, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { WSContext, WSEvents } from "hono/ws";
import { uuidv7 } from "uuidv7";
import { WebSocketServer } from "ws";
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
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("busy_timeout = 5000");
const db = drizzle(sqlite, { schema });
const repository = createRepository(db, { enableNIP26, maxQueryLimit: limits.maxQueryLimit });

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

const wsSendPayload = async (ws: WSContext, payload: RelayToClientPayload) => ws.send(JSON.stringify(payload));

const broadcastEvent = (event: Event) => {
  for (const { onMessage, filters } of subscriptions) {
    if (isEventMatchSomeFilters(filters, event, { enableNIP26 })) onMessage(event);
  }
};

const processEvent = async (ws: WSContext, _connectionId: string, payload: ClientToRelayPayload<"EVENT">) => {
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

const processReq = async (ws: WSContext, connectionId: string, payload: ClientToRelayPayload<"REQ">) => {
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

const processCount = async (ws: WSContext, _conId: string, payload: ClientToRelayPayload<"COUNT">) => {
  const [_, subscriptionId, ...filters] = payload;
  const count = await repository.countEventsByFilters(filters);
  wsSendPayload(ws, ["COUNT", subscriptionId, { count }]);
};

const closeSubscription = async (_ws: WSContext, conId: string, payload: ClientToRelayPayload<"CLOSE">) => {
  const [_, subscriptionId] = payload;
  removeSubscription(conId, subscriptionId);
};

app.all("/*", cors());

app.get(
  "/",
  upgradeWebSocket((): WSEvents => {
    const conId = uuidv7();
    let windowStart = Date.now();
    let messageCount = 0;

    return {
      async onMessage(evt, ws) {
        try {
          const data = String(evt.data);
          if (data.length > limits.maxMessageBytes) return wsSendPayload(ws, ["NOTICE", "invalid: message is too large"]);

          if (Date.now() - windowStart > 60_000) {
            windowStart = Date.now();
            messageCount = 0;
          }
          if (++messageCount > limits.maxMessagesPerMinute) return wsSendPayload(ws, ["NOTICE", "rate-limited: slow down"]);

          let json: unknown;
          try {
            json = JSON.parse(data);
          } catch {
            return wsSendPayload(ws, ["NOTICE", "invalid: payload is not valid JSON"]);
          }
          const result = validateClientToRelayPayload(json);
          if (!result.success) return wsSendPayload(ws, ["NOTICE", "invalid: payload is invalid"]);

          const { data: payload } = result;
          if (payload[0] === "EVENT") await processEvent(ws, conId, payload);
          if (payload[0] === "REQ") await processReq(ws, conId, payload);
          if (payload[0] === "CLOSE") await closeSubscription(ws, conId, payload);
          if (payload[0] === "COUNT") await processCount(ws, conId, payload);
        } catch (e) {
          console.error("failed to process message", e);
        }
      },
      onClose() {
        subscriptions = subscriptions.filter(({ connectionId }) => connectionId !== conId);
      },
    };
  }),
  async (c) => {
    if (c.req.header("Accept") === "application/nostr+json") return c.json(infomation);

    const totalEvents = await db.select({ count: count() }).from(schema.events);
    const totalIndexedTags = await db.select({ count: count() }).from(schema.tags);
    const recentEvents = await db
      .select({ count: count() })
      .from(schema.events)
      .where(gt(schema.events.first_seen, new Date(Date.now() - 24 * 60 * 60 * 1000)));

    return c.html(IndexPage(totalEvents[0].count, totalIndexedTags[0].count, recentEvents[0].count));
  },
);

serve({
  fetch: app.fetch,
  port: config.port,
  websocket: { server: new WebSocketServer({ noServer: true }) },
});

console.log(`Server running at http://localhost:${config.port}`);
