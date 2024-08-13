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

export const hasTag = (event: Event, tag: string): boolean => {
  return event.tags.some((t) => t?.[0] === tag);
};

export const getTagsByName = <T extends string>(event: Event, tag: T): [T, ...string[]][] => {
  return event.tags.filter((t) => t?.[0] === tag) as [T, ...string[]][];
};

export const getTagValuesByName = <T extends string>(event: Event, tag: T): string[] => {
  return getTagsByName(event, tag).map((t) => t[1]);
};
