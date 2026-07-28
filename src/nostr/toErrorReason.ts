import { REASON_MESSAGE_PREFIXES, type ReasonMessage } from "../types/core";

export const toErrorReason = (error: unknown): ReasonMessage => {
  const message = error instanceof Error ? error.message : "unknown error";
  return REASON_MESSAGE_PREFIXES.some((prefix) => message.startsWith(`${prefix}: `)) ? (message as ReasonMessage) : `error: ${message}`;
};
