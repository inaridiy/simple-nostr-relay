import * as schema from "@/database";
import { schnorr } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { finalizeEvent, generateSecretKey, getPublicKey, verifyEvent } from "nostr-tools/pure";
import { beforeAll, describe, expect, it } from "vitest";
import { verifyDelegation } from "./nostr/nips26";
import { createRepository } from "./repository";
import type { Event } from "./types/core";
import type { DeletionEvent } from "./types/nip9";

describe("Event Repository", () => {
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let repository: ReturnType<typeof createRepository>;

  beforeAll(async () => {
    const sqlite = new Database(":memory:");
    db = drizzle(sqlite, { schema });
    await migrate(db, { migrationsFolder: "./drizzle" });
    repository = createRepository(db, { enableNIP26: true });
  });

  describe("save event", () => {
    it("should save an simplest event", async () => {
      const sk = generateSecretKey();
      const event = finalizeEvent(
        {
          kind: 1,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: "hello",
        },
        sk,
      );
      await repository.saveEvent(event as unknown as Event);

      const savedEvent = await repository.queryEventById(event.id);
      expect(savedEvent).toMatchObject(event);
    });
    it("should throw an error when saving duplicated event", async () => {
      const sk = generateSecretKey();
      const event = finalizeEvent(
        {
          kind: 1,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: "hello",
        },
        sk,
      );
      await repository.saveEvent(event as unknown as Event);

      expect(repository.saveEvent(event as unknown as Event)).rejects.toThrow();
    });
    it("should save an event with tags", async () => {
      const sk = generateSecretKey();
      const event = finalizeEvent(
        {
          kind: 1,
          created_at: Math.floor(Date.now() / 1000),
          tags: [
            ["tag1", "value1"],
            ["tag2", "value2"],
          ],
          content: "hello",
        },
        sk,
      );
      await repository.saveEvent(event as unknown as Event);

      const savedEvent = await repository.queryEventById(event.id);
      expect(savedEvent).toMatchObject(event);
    });
    it("should save an event with tags and rest", async () => {
      const sk = generateSecretKey();
      const event = finalizeEvent(
        {
          kind: 1,
          created_at: Math.floor(Date.now() / 1000),
          tags: [
            ["tag1", "value1", "rest1"],
            ["tag2", "value2", "rest2"],
          ],
          content: "hello",
        },
        sk,
      );
      await repository.saveEvent(event as unknown as Event);

      const savedEvent = await repository.queryEventById(event.id);
      expect(savedEvent).toMatchObject(event);
    });
    it("should save an event with delegation", async () => {
      const delegator = generateSecretKey();
      const delegatee = generateSecretKey();

      const delegationTokenMessage = `nostr:delegation:${getPublicKey(delegatee)}:kind=1`;
      const token = schnorr.sign(sha256(delegationTokenMessage), delegator);

      const event = finalizeEvent(
        {
          kind: 1,
          created_at: Math.floor(Date.now() / 1000),
          tags: [["delegation", getPublicKey(delegator), "kind=1", bytesToHex(token)]],
          content: "hello",
        },
        delegatee,
      );

      expect(verifyDelegation(event as unknown as Event)).toBe(true);

      await repository.saveEvent(event as unknown as Event);
      const savedEvent = await repository.queryEventById(event.id);
      expect(savedEvent).toMatchObject(event);

      const rawSaved = await db.query.events.findFirst({ where: eq(schema.events.id, event.id) });
      expect(rawSaved?.detegator).toBe(getPublicKey(delegator));
    });
    it("should save an replaceable event", async () => {
      const sk = generateSecretKey();
      const event = finalizeEvent(
        {
          kind: 2,
          created_at: Math.floor(Date.now() / 1000) - 10,
          tags: [],
          content: "hello",
        },
        sk,
      );
      await repository.saveReplaceableEvent(event as unknown as Event);

      const [savedEvent] = await repository.queryEventsByFilters([{ kinds: [2], authors: [getPublicKey(sk)] }]);
      expect(savedEvent).toMatchObject(event);

      const newEvent = finalizeEvent(
        {
          kind: 2,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: "replaced",
        },
        sk,
      );

      await repository.saveReplaceableEvent(newEvent as unknown as Event);
      const [replacedEvent] = await repository.queryEventsByFilters([{ kinds: [2], authors: [getPublicKey(sk)] }]);
      expect(replacedEvent).toMatchObject(newEvent);

      const rawOldEvent = await db.query.events.findFirst({ where: eq(schema.events.id, event.id) });
      expect(rawOldEvent?.replaced).toBe(true);
    });
    it("should save replaceable event from multiple authors", async () => {
      const sk1 = generateSecretKey();
      const sk2 = generateSecretKey();

      const event1 = finalizeEvent(
        {
          kind: 2,
          created_at: Math.floor(Date.now() / 1000) - 10,
          tags: [],
          content: "hello",
        },
        sk1,
      );

      const event2 = finalizeEvent(
        {
          kind: 2,
          created_at: Math.floor(Date.now() / 1000) - 10,
          tags: [],
          content: "hello",
        },
        sk2,
      );

      await repository.saveReplaceableEvent(event1 as unknown as Event);
      await repository.saveReplaceableEvent(event2 as unknown as Event);

      const savedEvents = await repository.queryEventsByFilters([{ kinds: [2], authors: [getPublicKey(sk1), getPublicKey(sk2)] }]);
      expect(savedEvents).toHaveLength(2);

      const newEvent1 = finalizeEvent(
        {
          kind: 2,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: "replaced",
        },
        sk1,
      );

      await repository.saveReplaceableEvent(newEvent1 as unknown as Event);

      const [replacedEvent1] = await repository.queryEventsByFilters([{ kinds: [2], authors: [getPublicKey(sk1)] }]);
      expect(replacedEvent1).toMatchObject(newEvent1);
    });
    it("should save a parameterized replaceable event", async () => {
      const sk = generateSecretKey();
      const event = finalizeEvent(
        {
          kind: 30000,
          created_at: Math.floor(Date.now() / 1000) - 10,
          tags: [["d", "hoooo"]],
          content: "hello",
        },
        sk,
      );
      await repository.saveParameterizedReplaceableEvent(event as unknown as Event);

      const [savedEvent] = await repository.queryEventsByFilters([{ kinds: [30000], authors: [getPublicKey(sk)] }]);
      expect(savedEvent).toMatchObject(event);

      const newEvent = finalizeEvent(
        {
          kind: 30000,
          created_at: Math.floor(Date.now() / 1000),
          tags: [["d", "hoooo"]],
          content: "replaced",
        },
        sk,
      );

      await repository.saveParameterizedReplaceableEvent(newEvent as unknown as Event);
      const [replacedEvent] = await repository.queryEventsByFilters([{ kinds: [30000], authors: [getPublicKey(sk)] }]);
      expect(replacedEvent).toMatchObject(newEvent);

      const rawOldEvent = await db.query.events.findFirst({ where: eq(schema.events.id, event.id) });
      expect(rawOldEvent?.replaced).toBe(true);
    });
    it("should save a parameterized replaceable event different d", async () => {
      const sk = generateSecretKey();

      const event1 = finalizeEvent(
        {
          kind: 30000,
          created_at: Math.floor(Date.now() / 1000),
          tags: [["d", "hoooo"]],
          content: "hello",
        },
        sk,
      );

      await repository.saveParameterizedReplaceableEvent(event1 as unknown as Event);
      const [savedEvent1] = await repository.queryEventsByFilters([{ kinds: [30000], authors: [getPublicKey(sk)], "#d": ["hoooo"] }]);
      expect(savedEvent1).toMatchObject(event1);

      const event2 = finalizeEvent(
        {
          kind: 30000,
          created_at: Math.floor(Date.now() / 1000),
          tags: [["d", "hoooo2"]],
          content: "hello",
        },
        sk,
      );

      await repository.saveParameterizedReplaceableEvent(event2 as unknown as Event);
      const [savedEvent2] = await repository.queryEventsByFilters([{ kinds: [30000], authors: [getPublicKey(sk)], "#d": ["hoooo2"] }]);
      expect(savedEvent2).toMatchObject(event2);

      const rawOldEvent = await db.query.events.findFirst({ where: eq(schema.events.id, event1.id) });
      expect(rawOldEvent?.replaced).toBe(false);

      const events = await repository.queryEventsByFilters([{ kinds: [30000], authors: [getPublicKey(sk)] }]);
      expect(events).toHaveLength(2);
    });
    it("should save a temporary event", async () => {
      const sk = generateSecretKey();
      const event = finalizeEvent(
        {
          kind: 20000,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: "hello",
        },
        sk,
      );
      await repository.saveTemporaryEvent(event as unknown as Event);

      const savedEvents = await repository.queryEventsByFilters([{ kinds: [20000], authors: [getPublicKey(sk)] }]);
      expect(savedEvents).toHaveLength(0);
    });
    it("should not replace a replaceable event with an older one", async () => {
      const sk = generateSecretKey();
      const newerEvent = finalizeEvent(
        {
          kind: 2,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: "newer",
        },
        sk,
      );
      await repository.saveReplaceableEvent(newerEvent as unknown as Event);

      const olderEvent = finalizeEvent(
        {
          kind: 2,
          created_at: Math.floor(Date.now() / 1000) - 100,
          tags: [],
          content: "older, arrived late",
        },
        sk,
      );
      await repository.saveReplaceableEvent(olderEvent as unknown as Event);

      const [latestEvent] = await repository.queryEventsByFilters([{ kinds: [2], authors: [getPublicKey(sk)] }]);
      expect(latestEvent).toMatchObject(newerEvent);

      const rawOldEvent = await db.query.events.findFirst({ where: eq(schema.events.id, olderEvent.id) });
      expect(rawOldEvent).toBeUndefined();
    });
    it("should keep the event with the lowest id on equal created_at", async () => {
      const sk = generateSecretKey();
      const createdAt = Math.floor(Date.now() / 1000);
      const eventA = finalizeEvent({ kind: 2, created_at: createdAt, tags: [], content: "a" }, sk);
      const eventB = finalizeEvent({ kind: 2, created_at: createdAt, tags: [], content: "b" }, sk);
      const [lowest, highest] = eventA.id < eventB.id ? [eventA, eventB] : [eventB, eventA];

      await repository.saveReplaceableEvent(highest as unknown as Event);
      await repository.saveReplaceableEvent(lowest as unknown as Event);

      const [latestEvent] = await repository.queryEventsByFilters([{ kinds: [2], authors: [getPublicKey(sk)] }]);
      expect(latestEvent).toMatchObject(lowest);
    });
    it("should save an event with a single-element tag", async () => {
      const sk = generateSecretKey();
      const event = finalizeEvent(
        {
          kind: 1,
          created_at: Math.floor(Date.now() / 1000),
          tags: [["client"]],
          content: "hello",
        },
        sk,
      );
      await repository.saveEvent(event as unknown as Event);

      const savedEvent = await repository.queryEventById(event.id);
      expect(savedEvent).toMatchObject(event);
    });
  });
  describe("delete events", () => {
    it("should delete an event by e tag", async () => {
      const sk = generateSecretKey();
      const event1 = finalizeEvent(
        {
          kind: 1,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: "hello",
        },
        sk,
      );
      await repository.saveEvent(event1 as unknown as Event);

      const deletionEvent = finalizeEvent(
        {
          kind: 5,
          created_at: Math.floor(Date.now() / 1000),
          tags: [["e", event1.id]],
          content: "delete for test",
        },
        sk,
      );
      await repository.deleteEventsByDeletionEvent(deletionEvent as unknown as DeletionEvent);

      const savedEvent = await repository.queryEventById(event1.id);
      expect(savedEvent).toBe(null);

      const rawSaved1 = await db.query.events.findFirst({ where: eq(schema.events.id, event1.id) });
      expect(rawSaved1?.hidden).toBe(true);
    });
    it("should delete an event by a tag", async () => {
      const sk = generateSecretKey();
      const event1 = finalizeEvent(
        {
          kind: 4,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: "hello",
        },
        sk,
      );
      await repository.saveEvent(event1 as unknown as Event);
      const savedEvent = await repository.queryEventById(event1.id);
      expect(savedEvent).toMatchObject(event1);

      const deletionEvent = finalizeEvent(
        {
          kind: 5,
          created_at: Math.floor(Date.now() / 1000),
          tags: [["a", `${event1.kind}:${getPublicKey(sk)}`]],
          content: "delete for test",
        },
        sk,
      );
      await repository.deleteEventsByDeletionEvent(deletionEvent as unknown as DeletionEvent);
      const deletedEvent = await repository.queryEventById(event1.id);
      expect(deletedEvent).toBe(null);
    });
    it("should delete an event by a tag with d identifier", async () => {
      const sk = generateSecretKey();
      const event1 = finalizeEvent(
        {
          kind: 4,
          created_at: Math.floor(Date.now() / 1000),
          tags: [["d", "hoooo"]],
          content: "hello",
        },
        sk,
      );
      await repository.saveEvent(event1 as unknown as Event);
      const savedEvent = await repository.queryEventById(event1.id);
      expect(savedEvent).toMatchObject(event1);

      const deletionEvent = finalizeEvent(
        {
          kind: 5,
          created_at: Math.floor(Date.now() / 1000),
          tags: [["a", `${event1.kind}:${getPublicKey(sk)}:hoooo`]],
          content: "delete for test",
        },
        sk,
      );
      await repository.deleteEventsByDeletionEvent(deletionEvent as unknown as DeletionEvent);
      const deletedEvent = await repository.queryEventById(event1.id);
      expect(deletedEvent).toBe(null);
    });
    it("should reject a deletion event without e or a tags", async () => {
      const sk = generateSecretKey();
      const deletionEvent = finalizeEvent(
        {
          kind: 5,
          created_at: Math.floor(Date.now() / 1000),
          tags: [["k", "4"]],
          content: "delete for test",
        },
        sk,
      );
      await expect(repository.deleteEventsByDeletionEvent(deletionEvent as unknown as DeletionEvent)).rejects.toThrow();
    });
    it("should not delete events referenced only by a k tag", async () => {
      const sk = generateSecretKey();
      const event1 = finalizeEvent(
        {
          kind: 1,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: "hello",
        },
        sk,
      );
      await repository.saveEvent(event1 as unknown as Event);

      const event2 = finalizeEvent(
        {
          kind: 4,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: "hello",
        },
        sk,
      );
      await repository.saveEvent(event2 as unknown as Event);

      const deletionEvent = finalizeEvent(
        {
          kind: 5,
          created_at: Math.floor(Date.now() / 1000),
          tags: [
            ["e", event1.id],
            ["k", "4"],
          ],
          content: "delete for test",
        },
        sk,
      );
      await repository.deleteEventsByDeletionEvent(deletionEvent as unknown as DeletionEvent);

      const deletedEvent1 = await repository.queryEventById(event1.id);
      expect(deletedEvent1).toBe(null);

      const untouchedEvent2 = await repository.queryEventById(event2.id);
      expect(untouchedEvent2).toMatchObject(event2);
    });
    it("should only delete events that public key matches", async () => {
      const sk1 = generateSecretKey();
      const sk2 = generateSecretKey();

      const event1 = finalizeEvent(
        {
          kind: 4,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: "hello",
        },
        sk1,
      );
      await repository.saveEvent(event1 as unknown as Event);

      const event2 = finalizeEvent(
        {
          kind: 4,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: "hello",
        },
        sk2,
      );
      await repository.saveEvent(event2 as unknown as Event);

      const deletionEvent = finalizeEvent(
        {
          kind: 5,
          created_at: Math.floor(Date.now() / 1000),
          tags: [
            ["e", event1.id],
            ["e", event2.id],
          ],
          content: "delete for test",
        },
        sk1,
      );

      await repository.deleteEventsByDeletionEvent(deletionEvent as unknown as DeletionEvent);

      const deletedEvent1 = await repository.queryEventById(event1.id);
      expect(deletedEvent1).toBe(null);

      const deletedEvent2 = await repository.queryEventById(event2.id);
      expect(deletedEvent2).toMatchObject(event2);
    });
    it("should delete multiple events", async () => {
      const sk = generateSecretKey();

      const event1 = finalizeEvent(
        {
          kind: 1,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: "hello",
        },
        sk,
      );
      await repository.saveEvent(event1 as unknown as Event);

      const event2 = finalizeEvent(
        {
          kind: 4,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: "hello",
        },
        sk,
      );
      await repository.saveEvent(event2 as unknown as Event);

      const deletionEvent = finalizeEvent(
        {
          kind: 5,
          created_at: Math.floor(Date.now() / 1000),
          tags: [
            ["e", event1.id],
            ["e", event2.id],
          ],
          content: "delete for test",
        },
        sk,
      );

      await repository.deleteEventsByDeletionEvent(deletionEvent as unknown as DeletionEvent);

      const deletedEvent1 = await repository.queryEventById(event1.id);
      expect(deletedEvent1).toBe(null);

      const deletedEvent2 = await repository.queryEventById(event2.id);
      expect(deletedEvent2).toBe(null);
    });
    it("should not delete versions newer than the deletion request by a tag", async () => {
      const sk = generateSecretKey();
      const oldVersion = finalizeEvent(
        {
          kind: 30000,
          created_at: Math.floor(Date.now() / 1000) - 100,
          tags: [["d", "profile"]],
          content: "old",
        },
        sk,
      );
      const newVersion = finalizeEvent(
        {
          kind: 30000,
          created_at: Math.floor(Date.now() / 1000) + 100,
          tags: [["d", "profile"]],
          content: "new",
        },
        sk,
      );
      await repository.saveEvent(oldVersion as unknown as Event);
      await repository.saveEvent(newVersion as unknown as Event);

      const deletionEvent = finalizeEvent(
        {
          kind: 5,
          created_at: Math.floor(Date.now() / 1000),
          tags: [["a", `30000:${getPublicKey(sk)}:profile`]],
          content: "delete for test",
        },
        sk,
      );
      await repository.deleteEventsByDeletionEvent(deletionEvent as unknown as DeletionEvent);

      const deletedOldVersion = await repository.queryEventById(oldVersion.id);
      expect(deletedOldVersion).toBe(null);

      const survivingNewVersion = await repository.queryEventById(newVersion.id);
      expect(survivingNewVersion).toMatchObject(newVersion);
    });
    it("should not delete deletion events themselves", async () => {
      const sk = generateSecretKey();
      const event1 = finalizeEvent(
        {
          kind: 1,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: "hello",
        },
        sk,
      );
      await repository.saveEvent(event1 as unknown as Event);

      const deletionEvent1 = finalizeEvent(
        {
          kind: 5,
          created_at: Math.floor(Date.now() / 1000),
          tags: [["e", event1.id]],
          content: "delete for test",
        },
        sk,
      );
      await repository.deleteEventsByDeletionEvent(deletionEvent1 as unknown as DeletionEvent);
      await repository.saveEvent(deletionEvent1 as unknown as Event);

      const deletionEvent2 = finalizeEvent(
        {
          kind: 5,
          created_at: Math.floor(Date.now() / 1000),
          tags: [["e", deletionEvent1.id]],
          content: "delete the deletion",
        },
        sk,
      );
      await repository.deleteEventsByDeletionEvent(deletionEvent2 as unknown as DeletionEvent);

      const survivingDeletionEvent = await repository.queryEventById(deletionEvent1.id);
      expect(survivingDeletionEvent).toMatchObject(deletionEvent1);
    });
  });
  describe("query events", async () => {
    let sk1: Uint8Array;
    let sk2: Uint8Array;
    let sk3: Uint8Array;

    let sk1profile: Event;
    let event1: Event;
    let event2: Event;
    let sk2profile: Event;
    let sk3profile: Event;

    beforeAll(async () => {
      sk1 = generateSecretKey();
      sk2 = generateSecretKey();
      sk3 = generateSecretKey();

      sk1profile = finalizeEvent(
        { kind: 0, created_at: Math.floor(Date.now() / 1000) + 1, tags: [], content: JSON.stringify({ name: "sk1" }) },
        sk1,
      ) as unknown as Event;

      event1 = finalizeEvent(
        { kind: 1, created_at: Math.floor(Date.now() / 1000) + 2, tags: [["p", getPublicKey(sk2)]], content: "hello @sk2" },
        sk1,
      ) as unknown as Event;
      event2 = finalizeEvent(
        { kind: 1, created_at: Math.floor(Date.now() / 1000) + 3, tags: [["p", getPublicKey(sk3)]], content: "hello @sk3" },
        sk1,
      ) as unknown as Event;

      await repository.saveEvent(sk1profile as unknown as Event);
      await repository.saveEvent(event1 as unknown as Event);
      await repository.saveEvent(event2 as unknown as Event);

      sk2profile = finalizeEvent(
        { kind: 0, created_at: Math.floor(Date.now() / 1000) + 4, tags: [], content: JSON.stringify({ name: "sk2" }) },
        sk2,
      ) as unknown as Event;
      sk3profile = finalizeEvent(
        { kind: 0, created_at: Math.floor(Date.now() / 1000) + 5, tags: [], content: JSON.stringify({ name: "sk3" }) },
        sk3,
      ) as unknown as Event;

      await repository.saveEvent(sk2profile as unknown as Event);
      await repository.saveEvent(sk3profile as unknown as Event);
    });
    it("should query events by author", async () => {
      const events = await repository.queryEventsByFilters([{ authors: [getPublicKey(sk1)] }]);
      expect(events).toHaveLength(3);
      expect(events).toMatchObject([event2, event1, sk1profile]);
    });
    it("should query events by kind", async () => {
      const events = await repository.queryEventsByFilters([{ kinds: [0] }]);
      expect(events).toHaveLength(3);
      expect(events).toMatchObject([sk3profile, sk2profile, sk1profile]);
    });
    it("should query events by since", async () => {
      const events = await repository.queryEventsByFilters([{ since: sk1profile.created_at + 1, kinds: [0] }]);
      expect(events).toHaveLength(2);
      expect(events).toMatchObject([sk3profile, sk2profile]);
    });
    it("should query events by until", async () => {
      const events = await repository.queryEventsByFilters([{ until: sk3profile.created_at - 1, kinds: [0] }]);
      expect(events).toHaveLength(2);
      expect(events).toMatchObject([sk2profile, sk1profile]);
    });
    it("should query events by tag filter", async () => {
      const events = await repository.queryEventsByFilters([{ "#p": [getPublicKey(sk2)] }]);
      expect(events).toHaveLength(1);
      expect(events).toMatchObject([event1]);
    });
    it("should query events by multiple cond filter", async () => {
      const events = await repository.queryEventsByFilters([{ kinds: [1], authors: [getPublicKey(sk1)], "#p": [getPublicKey(sk2)] }]);
      expect(events).toHaveLength(1);
      expect(events).toMatchObject([event1]);
    });
    it("should query events by multiple filters", async () => {
      const events = await repository.queryEventsByFilters([
        { kinds: [1], authors: [getPublicKey(sk1)], "#p": [getPublicKey(sk2)] },
        { kinds: [0] },
      ]);
      expect(events).toHaveLength(4);
    });

    it("should count events by filters", async () => {
      const count = await repository.countEventsByFilters([{ kinds: [0] }]);
      expect(count).toBe(3);

      const count2 = await repository.countEventsByFilters([{ kinds: [1], authors: [getPublicKey(sk1)] }]);
      expect(count2).toBe(2);
    });

    it("should require all tag conditions to match", async () => {
      const sk = generateSecretKey();
      const referencedId = "0000000000000000000000000000000000000000000000000000000000000001";
      const event = finalizeEvent(
        {
          kind: 7,
          created_at: Math.floor(Date.now() / 1000),
          tags: [
            ["e", referencedId],
            ["p", getPublicKey(sk2)],
          ],
          content: "+",
        },
        sk,
      );
      await repository.saveEvent(event as unknown as Event);

      const bothMatch = await repository.queryEventsByFilters([{ "#e": [referencedId], "#p": [getPublicKey(sk2)] }]);
      expect(bothMatch).toMatchObject([event]);

      const onlyOneMatch = await repository.queryEventsByFilters([{ "#e": [referencedId], "#p": [getPublicKey(sk1)] }]);
      expect(onlyOneMatch).toHaveLength(0);
    });

    it("should count an event with multiple tags once", async () => {
      const sk = generateSecretKey();
      const event = finalizeEvent(
        {
          kind: 6,
          created_at: Math.floor(Date.now() / 1000),
          tags: [
            ["p", getPublicKey(sk2)],
            ["p", getPublicKey(sk3)],
          ],
          content: "",
        },
        sk,
      );
      await repository.saveEvent(event as unknown as Event);

      const count = await repository.countEventsByFilters([{ kinds: [6], authors: [getPublicKey(sk)] }]);
      expect(count).toBe(1);
    });

    it("should respect the requested limit", async () => {
      const events = await repository.queryEventsByFilters([{ kinds: [0], limit: 1 }]);
      expect(events).toHaveLength(1);
    });
  });
});
