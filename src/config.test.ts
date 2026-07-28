import { describe, expect, it } from "vitest";
import { loadConfig } from "./config";

describe("loadConfig", () => {
  it("should provide defaults when env is empty", () => {
    const config = loadConfig({});
    expect(config.port).toBe(3000);
    expect(config.databasePath).toBe("database.sqlite");
    expect(config.enableNIP26).toBe(false);
    expect(config.relay.name).toBe("Honostr Test Relay");
    expect(config.limits).toEqual({
      maxMessageBytes: 128 * 1024,
      maxSubscriptionsPerConnection: 20,
      maxFiltersPerRequest: 10,
      maxMessagesPerMinute: 300,
      maxQueryLimit: 2000,
    });
  });
  it("should read overrides from env", () => {
    const config = loadConfig({
      PORT: "8080",
      DATABASE_PATH: "/data/relay.sqlite",
      ENABLE_NIP26: "true",
      RELAY_NAME: "My Relay",
      MAX_MESSAGES_PER_MINUTE: "60",
    });
    expect(config.port).toBe(8080);
    expect(config.databasePath).toBe("/data/relay.sqlite");
    expect(config.enableNIP26).toBe(true);
    expect(config.relay.name).toBe("My Relay");
    expect(config.limits.maxMessagesPerMinute).toBe(60);
  });
  it("should treat anything but 'true' as NIP-26 disabled", () => {
    expect(loadConfig({ ENABLE_NIP26: "1" }).enableNIP26).toBe(false);
    expect(loadConfig({ ENABLE_NIP26: "false" }).enableNIP26).toBe(false);
  });
  it("should reject invalid values", () => {
    expect(() => loadConfig({ PORT: "not-a-number" })).toThrow(/invalid config/);
    expect(() => loadConfig({ PORT: "70000" })).toThrow(/invalid config/);
    expect(() => loadConfig({ RELAY_PUBKEY: "not-hex" })).toThrow(/invalid config/);
    expect(() => loadConfig({ MAX_MESSAGE_BYTES: "0" })).toThrow(/invalid config/);
    expect(() => loadConfig({ MAX_QUERY_LIMIT: "12.5" })).toThrow(/invalid config/);
  });
});
