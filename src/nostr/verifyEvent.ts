import { schnorr } from "@noble/curves/secp256k1";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import type { Event } from "../types/core";
import { verifyDelegation } from "./nips26";
import { hasTag, hashEvent } from "./utils";

export type VerifyEventOptions = {
  enableNIP26?: boolean;
};

/**
 * @description Verify a direct event signature not considering NIP-26.
 * Checks that `event.id` equals the sha256 of the serialized event, then verifies the signature over it.
 * @link https://github.com/nostr-protocol/nips/blob/master/01.md
 */
export const verifyDirectEvent = (event: Event): boolean => {
  const hash = hashEvent(event);
  if (bytesToHex(hash) !== event.id) return false;
  return schnorr.verify(hexToBytes(event.sig), hash, hexToBytes(event.pubkey));
};

/**
 * @description Verify an event signature, optionally considering NIP-26 "Delegated Event Signing"
 * @link https://github.com/nostr-protocol/nips/blob/master/1.md
 * @link https://github.com/nostr-protocol/nips/blob/master/26.md
 */
export const verifyEvent = (event: Event, options: VerifyEventOptions = {}): boolean => {
  if (options.enableNIP26 && hasTag(event, "delegation") && !verifyDelegation(event)) return false;
  return verifyDirectEvent(event);
};
