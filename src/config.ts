import type { Config } from "@/types/config";
import { validateConfig } from "@/validators/validateConfig";

/**
 * @description Assemble and validate the relay configuration. Every variable is optional and falls back to the default.
 */
export const loadConfig = (env: Record<string, string | undefined>): Config => {
  const candidate: Config = {
    port: Number(env.PORT ?? 3000),
    databasePath: env.DATABASE_PATH ?? "database.sqlite",
    // NIP-26 is unrecommended; enable it explicitly if you need it.
    enableNIP26: env.ENABLE_NIP26 === "true",
    relay: {
      name: env.RELAY_NAME ?? "Honostr Test Relay",
      description: env.RELAY_DESCRIPTION ?? "Honostr Test Relay",
      pubkey: env.RELAY_PUBKEY ?? "36d931a0c3e540393015c9ba9df8718b6259bf36180c9c4ef230ecc135c59c52",
      contact: env.RELAY_CONTACT ?? "inari@inaridiy.com",
    },
    limits: {
      maxMessageBytes: Number(env.MAX_MESSAGE_BYTES ?? 128 * 1024),
      maxSubscriptionsPerConnection: Number(env.MAX_SUBSCRIPTIONS_PER_CONNECTION ?? 20),
      maxFiltersPerRequest: Number(env.MAX_FILTERS_PER_REQUEST ?? 10),
      maxMessagesPerMinute: Number(env.MAX_MESSAGES_PER_MINUTE ?? 300),
      maxQueryLimit: Number(env.MAX_QUERY_LIMIT ?? 2000),
    },
  };

  const result = validateConfig(candidate);
  if (!result.success) {
    const details = result.errors.map(
      (error) => `${error.path} should be ${error.expected}, got ${Number.isNaN(error.value) ? "NaN" : JSON.stringify(error.value)}`,
    );
    throw new Error(`invalid config: ${details.join(", ")}`);
  }

  return result.data;
};

export const config = loadConfig(process.env);
