import type { Event } from "@/types/core";
import { createParallelBatcher, initThreadPool } from "rayon-ts";
import { type VerifyEventOptions, verifyEvent } from "./verifyEvent";

type VerifyEventInput = readonly [event: Event, enableNIP26: boolean];

const verifyEventInParallel = (input: VerifyEventInput): boolean => {
  "use parallel";
  return verifyEvent(input[0], { enableNIP26: input[1] });
};

initThreadPool();

const verifyEventBatch = createParallelBatcher(verifyEventInParallel);
const useSequentialVerification = process.env.RAYON_SEQUENTIAL === "1" || process.env.RAYON_NUM_THREADS === "0";

export const verifyEventBatched = (event: Event, options: VerifyEventOptions = {}): Promise<boolean> =>
  useSequentialVerification ? Promise.resolve(verifyEvent(event, options)) : verifyEventBatch([event, options.enableNIP26 ?? false]);
