import type { Event } from "@/types/core";
import { describe, expect, it } from "vitest";
import { isParameterizedReplaceableEvent, isReplaceableEvent, isTemporaryEvent } from "./utils";

const eventOfKind = (kind: number): Event => ({
  id: "00".repeat(32),
  pubkey: "11".repeat(32),
  created_at: 0,
  kind,
  tags: [],
  content: "",
  sig: "22".repeat(64),
});

describe("event kind classification", () => {
  it("classifies only NIP-01 replaceable kinds as replaceable", () => {
    expect([0, 3, 10000, 19999].every((kind) => isReplaceableEvent(eventOfKind(kind)))).toBe(true);
    expect([1, 41, 9999, 20000].some((kind) => isReplaceableEvent(eventOfKind(kind)))).toBe(false);
  });

  it("classifies the ephemeral range", () => {
    expect(isTemporaryEvent(eventOfKind(20000))).toBe(true);
    expect(isTemporaryEvent(eventOfKind(29999))).toBe(true);
    expect(isTemporaryEvent(eventOfKind(30000))).toBe(false);
  });

  it("classifies the addressable range", () => {
    expect(isParameterizedReplaceableEvent(eventOfKind(30000))).toBe(true);
    expect(isParameterizedReplaceableEvent(eventOfKind(39999))).toBe(true);
    expect(isParameterizedReplaceableEvent(eventOfKind(40000))).toBe(false);
  });
});
