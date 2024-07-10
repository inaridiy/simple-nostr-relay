import * as v from "valibot";
import type {
  ClientToRelayPayload,
  Event,
  SubscriptionFilter,
} from "../types/core";

const HexSchema = v.pipe(v.string(), v.hexadecimal());

const Hex32BytesSchema = v.pipe(HexSchema, v.length(64));
const Hex64BytesSchema = v.pipe(HexSchema, v.length(128));

const UnixTimestampSchema = v.number();

const EventSchema = v.object({
  id: Hex32BytesSchema,
  pubkey: Hex32BytesSchema,
  created_at: UnixTimestampSchema,
  kind: v.number(),
  tags: v.array(v.pipe(v.array(v.string()), v.minLength(1))),
  content: v.string(),
  sig: Hex64BytesSchema,
});

export const parseEvent = (event: unknown): Event => {
  return v.parse(EventSchema, event) as Event; // [string, ...string[]] is not supported by valibot. maybe
};

const SubscriptionFilterSchema = v.intersect([
  v.partial(
    v.object({
      ids: v.array(Hex32BytesSchema),
      authors: v.array(Hex32BytesSchema),
      kinds: v.array(v.number()),
      since: UnixTimestampSchema,
      until: UnixTimestampSchema,
      limit: v.number(),
    })
  ),
  v.record(
    v.custom<`#${string}`>((v) => typeof v === "string" && v.startsWith("#")),
    v.array(v.string())
  ),
]);

export const parseSubscriptionFilter = (
  filter: unknown
): SubscriptionFilter => {
  return v.parse(SubscriptionFilterSchema, filter);
};

const ClientToRelayPayloadsSchema = v.union([
  v.tuple([v.literal("EVENT"), EventSchema]),
  v.tuple([v.literal("REQ"), v.string(), SubscriptionFilterSchema]),
  v.tuple([v.literal("CLOSE"), v.string()]),
]);

export const parseClientToRelayPayload = (
  payload: unknown
): ClientToRelayPayload => {
  return v.parse(ClientToRelayPayloadsSchema, payload) as ClientToRelayPayload;
};
