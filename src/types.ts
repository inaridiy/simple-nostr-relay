export type Hex = string;
export type UnixTimestamp = number;

export type Event = {
  id: Hex; // 32-bytes lowercase hex-encoded sha256 of the serialized event data
  pubkey: Hex; // 32-bytes lowercase hex-encoded public key of the event creator
  created_at: UnixTimestamp; // unix timestamp in seconds
  kind: number; // integer between 0 and 65535
  tags: [string, ...string[]][];
  content: string; //arbitrary string
  sig: Hex; // 64-bytes lowercase hex of the signature of the sha256 hash of the serialized event data, which is the same as the "id" field
};

export type SerializedEvent = [
  0,
  pubkey: Hex, // pubkey, as a lowercase hex string
  created_at: UnixTimestamp, // created_at, as a number
  kind: number, // kind, as a number
  tags: [string, ...string[]][], // tags, as an array of arrays of non-null strings
  content: string, // content, as a string
];

export type SubscriptionFilter = Partial<{
  ids: Hex[]; // a list of event ids
  authors: Hex[]; // a list of lowercase pubkeys, the pubkey of an event must be one of these
  kinds: number[]; // a list of a kind numbers
  [event: `#${string}`]: string[]; // a list of tag values, for #e — a list of event ids, for #p — a list of pubkeys, etc.
  since: UnixTimestamp; // an integer unix timestamp in seconds, events must be newer than this to pass
  until: UnixTimestamp; // an integer unix timestamp in seconds, events must be older than this to pass
  limit: number; // maximum number of events relays SHOULD return in the initial query
}>;

export type ClientToRelayPayloads = {
  EVENT: ["EVENT", event: Event];
  REQ: ["REQ", subscriptionId: string, ...SubscriptionFilter[]];
  CLOSE: ["CLOSE", subscriptionId: string];
};

type ReasonMessagePrefix = "duplicate" | "pow" | "blocked" | "rate-limited" | "invalid" | "error";
type ReasonMessage = `${ReasonMessagePrefix}: ${string}`;

export type RelayToClientPayloads = {
  EVENT: ["EVENT", subscriptionId: string, event: Event];
  OK: ["OK", eventId: Hex, isOk: boolean, message: ReasonMessage];
  EOSE: ["EOSE", subscriptionId: string];
  CLOSED: ["CLOSED", subscriptionId: ReasonMessage];
  NOTICE: ["NOTICE", message: string];
};
