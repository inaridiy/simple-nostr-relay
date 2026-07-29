import type { Event } from "@/types/core";
import { finalizeEvent, generateSecretKey } from "nostr-tools/pure";
import { rayonStats, shutdownThreadPool } from "rayon-ts";
import { afterAll, describe, expect, it } from "vitest";
import { verifyEventBatched } from "./verifyEventBatched";

const createEvent = (): Event =>
  finalizeEvent(
    {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: "hello",
    },
    generateSecretKey(),
  ) as unknown as Event;

afterAll(() => shutdownThreadPool());

describe("verifyEventBatched", () => {
  it("verifies concurrent events in rayon workers", async () => {
    const valid = createEvent();
    const forged = { ...createEvent(), id: "ff".repeat(32) };

    await expect(Promise.all([verifyEventBatched(valid), verifyEventBatched(forged)])).resolves.toEqual([true, false]);
    expect(rayonStats()?.threadsUsed).toBeGreaterThan(0);
  });
});
