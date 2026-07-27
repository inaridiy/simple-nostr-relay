import type { Event } from "@/types/core";
import { schnorr } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import { finalizeEvent, generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { describe, expect, it } from "vitest";
import { checkDelegationQuery } from "./nips26";
import { verifyDirectEvent, verifyEvent } from "./verifyEvent";

const createEvent = (created_at = Math.floor(Date.now() / 1000)) => {
  const sk = generateSecretKey();
  return finalizeEvent({ kind: 1, created_at, tags: [], content: "hello" }, sk) as unknown as Event;
};

describe("verifyDirectEvent", () => {
  it("should accept a valid event", () => {
    expect(verifyDirectEvent(createEvent())).toBe(true);
  });
  it("should reject an event whose id does not match its content", () => {
    const forged = { ...createEvent(), id: "ff".repeat(32) };
    expect(verifyDirectEvent(forged)).toBe(false);
  });
  it("should reject an event with a broken signature", () => {
    const forged = { ...createEvent(), sig: "ff".repeat(64) };
    expect(verifyDirectEvent(forged)).toBe(false);
  });
});

describe("verifyEvent with NIP-26", () => {
  const createDelegatedEvent = (query: string, created_at: number) => {
    const delegator = generateSecretKey();
    const delegatee = generateSecretKey();
    const token = schnorr.sign(sha256(`nostr:delegation:${getPublicKey(delegatee)}:${query}`), delegator);
    return finalizeEvent(
      { kind: 1, created_at, tags: [["delegation", getPublicKey(delegator), query, bytesToHex(token)]], content: "hello" },
      delegatee,
    ) as unknown as Event;
  };

  it("should accept a valid delegated event", () => {
    const now = Math.floor(Date.now() / 1000);
    const event = createDelegatedEvent(`kind=1&created_at<${now + 100}&created_at>${now - 100}`, now);
    expect(verifyEvent(event, { enableNIP26: true })).toBe(true);
  });
  it("should reject a delegated event outside the time conditions", () => {
    const now = Math.floor(Date.now() / 1000);
    const beforeWindow = createDelegatedEvent(`created_at>${now - 100}`, now - 200);
    const afterWindow = createDelegatedEvent(`created_at<${now + 100}`, now + 200);
    expect(verifyEvent(beforeWindow, { enableNIP26: true })).toBe(false);
    expect(verifyEvent(afterWindow, { enableNIP26: true })).toBe(false);
  });
  it("should ignore delegation tags when NIP-26 is disabled", () => {
    const now = Math.floor(Date.now() / 1000);
    const event = createDelegatedEvent(`created_at>${now + 100}`, now);
    expect(verifyEvent(event)).toBe(true);
  });
});

describe("checkDelegationQuery", () => {
  const eventAt = (created_at: number) => ({ ...createEvent(), created_at });

  it("should allow only events before the created_at< condition", () => {
    expect(checkDelegationQuery(eventAt(999), "created_at<1000")).toBe(true);
    expect(checkDelegationQuery(eventAt(1000), "created_at<1000")).toBe(false);
    expect(checkDelegationQuery(eventAt(1001), "created_at<1000")).toBe(false);
  });
  it("should allow only events after the created_at> condition", () => {
    expect(checkDelegationQuery(eventAt(1001), "created_at>1000")).toBe(true);
    expect(checkDelegationQuery(eventAt(1000), "created_at>1000")).toBe(false);
    expect(checkDelegationQuery(eventAt(999), "created_at>1000")).toBe(false);
  });
  it("should require all conditions to hold", () => {
    expect(checkDelegationQuery(eventAt(500), "kind=1&created_at>100&created_at<1000")).toBe(true);
    expect(checkDelegationQuery(eventAt(1500), "kind=1&created_at>100&created_at<1000")).toBe(false);
  });
  it("should reject unknown conditions", () => {
    expect(checkDelegationQuery(eventAt(500), "hoge=1")).toBe(false);
  });
});
