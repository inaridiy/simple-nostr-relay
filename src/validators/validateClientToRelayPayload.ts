import typia from "typia";
import type { ClientToRelayPayload } from "../types/core";

export const validateClientToRelayPayload = typia.createValidate<ClientToRelayPayload>();
