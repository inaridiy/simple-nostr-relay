import * as schema from "@/database";
import { schnorr } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { finalizeEvent, generateSecretKey, getPublicKey } from "nostr-tools/pure";
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
          kind: 1,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: "hello",
        },
        sk,
      );
      await repository.saveEvent(event1 as unknown as Event);
    });
  });
  // describe("query events", async () => {
  //   beforeAll(async () => {
  //     const sk1 = generateSecretKey();
  //     const sk2 = generateSecretKey();
  //     const sk3 = generateSecretKey();
  //   });
  // });
});
