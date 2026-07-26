import { renderToString } from "hono/jsx/dom/server";
import { describe, expect, it } from "vitest";
import type { RelayInfomaion } from "../types/nip11";
import { IndexPage } from "./index";

const relayInformation: RelayInfomaion = {
  name: "Yuta Nostr Relay",
  description: "A personal Nostr relay.",
  pubkey: "36d931a0c3e540393015c9ba9df8718b6259bf36180c9c4ef230ecc135c59c52",
  contact: "mailto:yuta@example.com",
  supported_nips: [1, 11],
  software: "simple-nostr-relay",
  version: "0.0.0",
};

describe("IndexPage", () => {
  it("renders relay metadata and URL for the current deployment", () => {
    const html = renderToString(IndexPage(relayInformation, "wss://nostr.yutakobayashi.com/"));

    expect(html).toContain("Yuta Nostr Relay");
    expect(html).toContain("A personal Nostr relay.");
    expect(html).toContain("wss://nostr.yutakobayashi.com/");
    expect(html).not.toContain("wss://nostr.inaridiy.com/");
    expect(html).not.toContain("Total Events");
    expect(html).not.toContain("Total Indexed Tags");
    expect(html).not.toContain("Events in Last 24 Hours");
  });
});
