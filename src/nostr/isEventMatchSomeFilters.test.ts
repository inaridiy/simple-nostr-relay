import type { Event } from "@/types/core";
import { describe, expect, it } from "vitest";
import { isEventMatchFilter, isEventMatchSomeFilters } from "./isEventMatchSomeFilters";

const baseEvent: Event = {
  id: "aa5d1c8b70862cbf42840e5c15d81306a5cadbf0e4bbb542a06d90dddcdcf0d2",
  pubkey: "36d931a0c3e540393015c9ba9df8718b6259bf36180c9c4ef230ecc135c59c52",
  created_at: 1000,
  kind: 1,
  tags: [
    ["e", "0000000000000000000000000000000000000000000000000000000000000001"],
    ["p", "0000000000000000000000000000000000000000000000000000000000000002"],
  ],
  content: "hello",
  sig: "00".repeat(64),
};

describe("isEventMatchFilter", () => {
  it("should match an empty filter", () => {
    expect(isEventMatchFilter({}, baseEvent)).toBe(true);
  });
  it("should match only exact ids", () => {
    expect(isEventMatchFilter({ ids: [baseEvent.id] }, baseEvent)).toBe(true);
    expect(isEventMatchFilter({ ids: [baseEvent.id.slice(0, 8)] }, baseEvent)).toBe(false);
    expect(isEventMatchFilter({ ids: ["ff".repeat(32)] }, baseEvent)).toBe(false);
    expect(isEventMatchFilter({ ids: [] }, baseEvent)).toBe(false);
  });
  it("should match by authors", () => {
    expect(isEventMatchFilter({ authors: [baseEvent.pubkey] }, baseEvent)).toBe(true);
    expect(isEventMatchFilter({ authors: ["ff".repeat(32)] }, baseEvent)).toBe(false);
    expect(isEventMatchFilter({ authors: [] }, baseEvent)).toBe(false);
  });
  it("should match by kinds", () => {
    expect(isEventMatchFilter({ kinds: [1, 2] }, baseEvent)).toBe(true);
    expect(isEventMatchFilter({ kinds: [0] }, baseEvent)).toBe(false);
  });
  it("should match by since and until", () => {
    expect(isEventMatchFilter({ since: 999, until: 1001 }, baseEvent)).toBe(true);
    expect(isEventMatchFilter({ since: 1001 }, baseEvent)).toBe(false);
    expect(isEventMatchFilter({ until: 999 }, baseEvent)).toBe(false);
    expect(isEventMatchFilter({ until: 0 }, baseEvent)).toBe(false);
  });
  it("should match by a tag condition", () => {
    expect(isEventMatchFilter({ "#e": ["0000000000000000000000000000000000000000000000000000000000000001"] }, baseEvent)).toBe(true);
    expect(isEventMatchFilter({ "#e": ["ff".repeat(32)] }, baseEvent)).toBe(false);
    expect(isEventMatchFilter({ "#t": ["nostr"] }, baseEvent)).toBe(false);
  });
  it("should not ignore unsupported filters", () => {
    expect(isEventMatchFilter({ search: "hello" }, baseEvent)).toBe(false);
    expect(isEventMatchFilter({ "#topic": ["nostr"] }, baseEvent)).toBe(false);
  });
  it("should require all tag conditions to match", () => {
    const bothMatch = {
      "#e": ["0000000000000000000000000000000000000000000000000000000000000001"],
      "#p": ["0000000000000000000000000000000000000000000000000000000000000002"],
    };
    const onlyOneMatch = {
      "#e": ["0000000000000000000000000000000000000000000000000000000000000001"],
      "#p": ["ff".repeat(32)],
    };
    expect(isEventMatchFilter(bothMatch, baseEvent)).toBe(true);
    expect(isEventMatchFilter(onlyOneMatch, baseEvent)).toBe(false);
  });
  it("should match delegated events by delegator only when NIP-26 is enabled", () => {
    const delegator = "1111111111111111111111111111111111111111111111111111111111111111";
    const delegatedEvent: Event = { ...baseEvent, tags: [["delegation", delegator, "kind=1", "00".repeat(64)]] };
    expect(isEventMatchFilter({ authors: [delegator] }, delegatedEvent, { enableNIP26: true })).toBe(true);
    expect(isEventMatchFilter({ authors: [delegator] }, delegatedEvent)).toBe(false);
  });
});

describe("isEventMatchSomeFilters", () => {
  it("should match when some filter matches", () => {
    expect(isEventMatchSomeFilters([{ kinds: [0] }, { kinds: [1] }], baseEvent)).toBe(true);
    expect(isEventMatchSomeFilters([{ kinds: [0] }, { kinds: [2] }], baseEvent)).toBe(false);
    expect(isEventMatchSomeFilters([], baseEvent)).toBe(false);
  });
});
