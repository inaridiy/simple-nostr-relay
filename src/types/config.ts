import type { Hex } from "./core";

/**
 * @description Relay configuration, assembled from environment variables in src/config.ts
 */
export interface Config {
  /**
   * @description Port the relay listens on (PORT)
   * @type uint32
   * @minimum 1
   * @maximum 65535
   */
  port: number;
  /**
   * @description Path to the SQLite database file (DATABASE_PATH)
   * @minLength 1
   */
  databasePath: string;
  /**
   * @description Enable NIP-26 delegated events, an unrecommended NIP (ENABLE_NIP26)
   */
  enableNIP26: boolean;
  relay: {
    /** @description Relay name for NIP-11 (RELAY_NAME) */
    name: string;
    /** @description Relay description for NIP-11 (RELAY_DESCRIPTION) */
    description: string;
    /**
     * @description Administrative pubkey for NIP-11 (RELAY_PUBKEY)
     * @pattern ^[0-9a-f]{64}$
     */
    pubkey: Hex;
    /** @description Administrative contact for NIP-11 (RELAY_CONTACT) */
    contact: string;
  };
  limits: {
    /**
     * @description Maximum WebSocket message size in bytes (MAX_MESSAGE_BYTES)
     * @type uint32
     * @minimum 1
     */
    maxMessageBytes: number;
    /**
     * @description Maximum subscriptions per connection (MAX_SUBSCRIPTIONS_PER_CONNECTION)
     * @type uint32
     * @minimum 1
     */
    maxSubscriptionsPerConnection: number;
    /**
     * @description Maximum filters per REQ/COUNT (MAX_FILTERS_PER_REQUEST)
     * @type uint32
     * @minimum 1
     */
    maxFiltersPerRequest: number;
    /**
     * @description Maximum client messages per minute per connection (MAX_MESSAGES_PER_MINUTE)
     * @type uint32
     * @minimum 1
     */
    maxMessagesPerMinute: number;
    /**
     * @description Maximum events returned by a single query (MAX_QUERY_LIMIT)
     * @type uint32
     * @minimum 1
     */
    maxQueryLimit: number;
  };
}
