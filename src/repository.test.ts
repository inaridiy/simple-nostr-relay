import * as schema from "@/database";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { finalizeEvent, generateSecretKey } from "nostr-tools/pure";
import { beforeAll, describe, expect, it } from "vitest";
import { createRepository } from "./repository";
import type { Event } from "./types/core";

describe("Event Repository", () => {
  let repository: ReturnType<typeof createRepository>;

  beforeAll(async () => {
    const sqlite = new Database(":memory:");
    const db = drizzle(sqlite, { schema });
    await migrate(db, { migrationsFolder: "./drizzle" });
    repository = createRepository(db, { enableNIP26: true });
  });

  describe("create event", () => {
    it("should create an event", async () => {
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
      expect(savedEvent).toBeDefined();
    });
  });
});
