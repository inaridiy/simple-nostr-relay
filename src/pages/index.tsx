import type { RelayInfomaion } from "@/types/nip11";

export const IndexPage = (
  totalEvents: number,
  totalIndexedTags: number,
  recentEvents: number,
  relayInformation: RelayInfomaion,
  relayUrl: string,
) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{relayInformation.name}</title>
        <link rel="stylesheet" href="https://fonts.xz.style/serve/inter.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@exampledev/new.css@1.1.2/new.min.css" />
      </head>
      <body>
        <header>
          <h1>{relayInformation.name}</h1>
        </header>

        <main>
          <p>{relayInformation.description}</p>
          <p>
            <strong>Software:</strong> {relayInformation.software}
          </p>

          <section class="analytics">
            <h2>Relay</h2>
            <p>{relayUrl}</p>
            <ul>
              <li>
                Total Events: <span id="totalEvents">{totalEvents}</span>
              </li>
              <li>
                Total Indexed Tags: <span id="totalUsers">{totalIndexedTags}</span>
              </li>
              <li>
                Events in Last 24 Hours: <span id="recentEvents">{recentEvents}</span>
              </li>
            </ul>
          </section>

          <h2>Features</h2>
          <ul>
            <li>
              ✅ NIP-01: <a href="https://github.com/nostr-protocol/nips/blob/master/01.md">Basic protocol flow description</a>
            </li>
            <li>
              ✅ NIP-02: <a href="https://github.com/nostr-protocol/nips/blob/master/02.md">Contact List and Petnames</a>
            </li>
            <li>
              ✅ NIP-09: <a href="https://github.com/nostr-protocol/nips/blob/master/09.md">Event Deletion</a>
            </li>
            <li>
              ✅ NIP-11: <a href="https://github.com/nostr-protocol/nips/blob/master/11.md">Relay Information Document</a>
            </li>
            <li>
              ✅ NIP-26: <a href="https://github.com/nostr-protocol/nips/blob/master/26.md">Event Delegation</a>
            </li>
            <li>
              ❌ NIP-42: <a href="https://github.com/nostr-protocol/nips/blob/master/42.md">Authentication of clients to relays</a>
            </li>
            <li>
              ✅ NIP-45: <a href="https://github.com/nostr-protocol/nips/blob/master/45.md">Event Counts</a>
            </li>
          </ul>

          <h2>Quickstart</h2>
          <pre>
            <code>pnpm install # Install dependencies pnpm migrate # Create database pnpm run dev # Start the relay</code>
          </pre>

          <h2>License</h2>
          <p>MIT</p>
        </main>
      </body>
    </html>
  );
};
