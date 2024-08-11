import type { DelegationTokenMessage } from "@/types/nip26";
import { validateDelegationTag } from "@/validators/validateDelegationTag";
import { schnorr } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { hexToBytes } from "@noble/hashes/utils";
import type { Event } from "../types/core";
import { getTag } from "./utils";

export const checkDelegationQuery = (event: Event, query: string): boolean => {
  for (const cond of query.split("&")) {
    if (cond.startsWith("kind=")) {
      const kind = Number(cond.split("=")[1]);
      if (kind !== event.kind) return false;
    } else if (cond.startsWith("created_at<")) {
      const time = Number(cond.split("<")[1]);
      if (time >= event.created_at) return false;
    } else if (cond.startsWith("created_at>")) {
      const time = Number(cond.split(">")[1]);
      if (time <= event.created_at) return false;
    } else {
      // Invalid condition
      return false;
    }
  }

  return true;
};

/**
 * @description Verify a delegated event signature defined by NIP-26
 * @link https://github.com/nostr-protocol/nips/blob/master/26.md
 */
export const verifyDelegation = (event: Event): boolean => {
  const validDelegation = validateDelegationTag(getTag(event, "delegation"));
  if (!validDelegation.success) return false;

  const [, delegatorPubkey, query, token] = validDelegation.data;
  if (!checkDelegationQuery(event, query)) return false;

  const tokenMessage: DelegationTokenMessage = `nostr:delegation:${event.pubkey}:${query}`;
  if (!schnorr.verify(hexToBytes(token), sha256(tokenMessage), hexToBytes(delegatorPubkey))) return false;

  return true;
};
