import { schnorr } from "@noble/curves/secp256k1";
import { hexToBytes } from "@noble/hashes/utils";
import type { Event } from "../types/core";
import { hashEvent } from "./utils";

export const verifyEvent = async (event: Event): Promise<boolean> => {
  return schnorr.verify(hexToBytes(event.sig), hashEvent(event), hexToBytes(event.pubkey));
};
