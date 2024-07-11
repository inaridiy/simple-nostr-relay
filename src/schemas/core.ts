import * as v from "valibot";
import type { ClientToRelayPayload, Event, SubscriptionFilter } from "../types/core";

const HexSchema = v.pipe(v.string(), v.hexadecimal());

const Hex32BytesSchema = v.pipe(HexSchema, v.length(64));
const Hex64BytesSchema = v.pipe(HexSchema, v.length(128));

const UnixTimestampSchema = v.number();

const EventTagSchema = v.custom<Event["tags"][number]>((input) => {
  if (!Array.isArray(input)) return false;
  if (input.length === 0) return false;
  if (!["e", "p"].includes(input[0])) return true; // ignore unknown tags
  const result = v.safeParse(Hex32BytesSchema, input[1]);
  return result.success;
});

const EventSchema = v.object({
  id: Hex32BytesSchema,
  pubkey: Hex32BytesSchema,
  created_at: UnixTimestampSchema,
  kind: v.number(),
  tags: v.array(EventTagSchema),
  content: v.string(),
  sig: Hex64BytesSchema,
});

export const parseEvent = (event: unknown): Event => {
  return v.parse(EventSchema, event);
};

const SubscriptionFilterSchema = v.partial(
  v.objectWithRest(
    {
      ids: v.array(Hex32BytesSchema),
      authors: v.array(Hex32BytesSchema),
      kinds: v.array(v.number()),
      since: UnixTimestampSchema,
      until: UnixTimestampSchema,
      limit: v.number(),
    },
    v.array(v.string()),
  ),
);

export const parseSubscriptionFilter = (filter: unknown): SubscriptionFilter => {
  return v.parse(SubscriptionFilterSchema, filter);
};

const ClientToRelayPayloadsSchema = v.union([
  v.tuple([v.literal("EVENT"), EventSchema]),
  v.tupleWithRest([v.literal("REQ"), v.string()], SubscriptionFilterSchema),
  v.tuple([v.literal("CLOSE"), v.string()]),
]);

export const parseClientToRelayPayload = (payload: unknown): ClientToRelayPayload => {
  return v.parse(ClientToRelayPayloadsSchema, payload);
};
