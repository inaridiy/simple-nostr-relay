# Simple Nostr Relay

A simple [nostr](https://github.com/nostr-protocol/nostr) relay written in TypeScript and Hono.
It supports the main Nostr Protocol and stores data in an SQLite database.

# Hosted Relay (not recommended for production)

wss://nostr.inaridiy.com/

## Features

- [x] NIP-01: [Basic protocol flow description](https://github.com/nostr-protocol/nips/blob/master/01.md)
- [x] NIP-02: [Contact List and Petnames](https://github.com/nostr-protocol/nips/blob/master/02.md)
- [x] NIP-09: [Event Deletion](https://github.com/nostr-protocol/nips/blob/master/09.md)
- [x] NIP-11: [Relay Information Document](https://github.com/nostr-protocol/nips/blob/master/11.md)
- [x] NIP-26: [Event Delegation](https://github.com/nostr-protocol/nips/blob/master/26.md) (unrecommended NIP; disabled by default, enable with `ENABLE_NIP26=true`)
- [ ] NIP-42: [Authentication of clients to relays](https://github.com/nostr-protocol/nips/blob/master/42.md)
- [x] NIP-45: [Event Counts](https://github.com/nostr-protocol/nips/blob/master/45.md)
- Batched signature verification with [rayon-ts](https://github.com/kanarus/rayon-ts)

## Quickstart

```bash
pnpm install # Install dependencies
pnpm migrate # Create database
pnpm run dev # Build and start the relay with rayon-ts
```

For sequential hot reload during development, use `pnpm run dev:watch`.

## Configuration

Application settings are read from environment variables and validated on startup in
`src/config.ts`. `RAYON_NUM_THREADS` is read directly by rayon-ts.
Every variable is optional; see [`.env.example`](.env.example) for the full list.

| Variable                                                               | Default              | Description                                                  |
| ---------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------ |
| `PORT`                                                                 | `3000`               | Port the relay listens on                                    |
| `DATABASE_PATH`                                                        | `database.sqlite`    | Path to the SQLite database file                             |
| `ENABLE_NIP26`                                                         | (disabled)           | Set `true` to enable NIP-26 delegated events                 |
| `RELAY_NAME` / `RELAY_DESCRIPTION` / `RELAY_PUBKEY` / `RELAY_CONTACT` | –                    | NIP-11 relay information                                     |
| `MAX_MESSAGE_BYTES`                                                    | `131072`             | Maximum WebSocket message size                               |
| `MAX_SUBSCRIPTIONS_PER_CONNECTION`                                     | `20`                 | Subscriptions per connection                                 |
| `MAX_FILTERS_PER_REQUEST`                                              | `10`                 | Filters per REQ/COUNT                                        |
| `MAX_MESSAGES_PER_MINUTE`                                              | `300`                | Client messages per minute per connection                    |
| `MAX_QUERY_LIMIT`                                                      | `2000`               | Maximum events returned by a single query                    |
| `RAYON_NUM_THREADS`                                                    | `min(8, CPUs - 1)`   | Signature-verification workers; set `0` for direct execution |

## Benchmark

### Rayon signature verification

Run the reproducible direct-vs-rayon benchmark with:

```bash
pnpm bench:rayon
```

Median of three runs (2026-07-28, 24-core Linux, Node 24.15.0, 1,000 pre-signed
events per run, acknowledgement-paced loopback WebSockets, one in-flight event per
connection, fresh SQLite database and relay process for each sample):

| Connections | Sequential events/s | Rayon events/s | Speedup | Sequential p50/p95 (ms) | Rayon p50/p95 (ms) |
| ----------- | ------------------: | -------------: | ------: | ----------------------: | ------------------: |
| 1           |             2,117.8 |          589.5 |  0.278x |             0.405/0.546 |         1.618/1.864 |
| 4           |             2,452.4 |        1,724.6 |  0.703x |             1.138/2.940 |         2.075/3.085 |
| 16          |             2,495.9 |        3,728.5 |  1.494x |            5.356/10.576 |         3.316/8.999 |
| 64          |             2,475.8 |        4,568.0 |  1.845x |           25.109/30.403 |       12.623/42.058 |

At 16 connections with 3,000 events, rayon sustained 4,132.5 events/s versus
2,582.1 events/s sequentially (1.600x). The crossover on this machine is between
4 and 16 concurrent publishers; rayon's 64-connection p95 remains higher despite
its better throughput and median latency.

### Historical cross-relay comparison

Median of three runs (2026-07-28, 24-core Linux, Node 24.15.0, loopback, one relay process
at a time, WebSocket compression disabled).
Each run started from an empty database: 5,000 pre-signed kind-1 events were published over
16 connections, followed by 800 mixed-filter REQ queries over 8 connections, with one
in-flight operation per connection. All relays received the same events and returned the
same 35,922 event IDs across the queries.

| Relay                              | Writes (events/s) | Reads (queries/s) |
| ---------------------------------- | ----------------- | ----------------- |
| simple-nostr-relay (pre-rayon)     | 1,806             | 1,589             |
| nostr-rs-relay 0.10.0 (Rust/SQLite)| 2,181             | 195               |
| strfry 1.1.1 (C++/LMDB)            | **3,765**         | **2,796**         |

These are end-to-end, acknowledgement-paced WebSocket results, including protocol parsing,
signature verification, storage, query execution, and response serialization. The database
fits in memory, so large-dataset performance may differ.

## License

MIT
