import { sha256 } from "@noble/hashes/sha256";
import type { Event, SerializedEvent } from "../types/core";

export const serializeEvent = (event: Event): SerializedEvent => {
  return [0, event.pubkey, event.created_at, event.kind, event.tags, event.content];
};

export const hashEvent = (event: Event): Uint8Array => {
  const serialized = serializeEvent(event);
  const messageHash = sha256(JSON.stringify(serialized));
  return messageHash;
};
