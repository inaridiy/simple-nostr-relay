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

## Quickstart

```bash
pnpm install # Install dependencies
pnpm migrate # Create database
pnpm run dev # Start the relay
```

## Configuration

All settings are read from environment variables and validated on startup in `src/config.ts`.
Every variable is optional; see [`.env.example`](.env.example) for the full list.

| Variable                                                        | Default            | Description                                     |
| --------------------------------------------------------------- | ------------------ | ----------------------------------------------- |
| `PORT`                                                           | `3000`             | Port the relay listens on                       |
| `DATABASE_PATH`                                                  | `database.sqlite`  | Path to the SQLite database file                |
| `ENABLE_NIP26`                                                   | (disabled)         | Set `true` to enable NIP-26 delegated events    |
| `RELAY_NAME` / `RELAY_DESCRIPTION` / `RELAY_PUBKEY` / `RELAY_CONTACT` | –            | NIP-11 relay information                        |
| `MAX_MESSAGE_BYTES`                                              | `131072`           | Maximum WebSocket message size                  |
| `MAX_SUBSCRIPTIONS_PER_CONNECTION`                               | `20`               | Subscriptions per connection                    |
| `MAX_FILTERS_PER_REQUEST`                                        | `10`               | Filters per REQ/COUNT                           |
| `MAX_MESSAGES_PER_MINUTE`                                        | `300`              | Client messages per minute per connection       |
| `MAX_QUERY_LIMIT`                                                | `2000`             | Maximum events returned by a single query       |

## Benchmark

Casual single-run numbers (2026-07-28, 24-core Linux, loopback, single relay process each).
5,000 pre-signed kind-1 events published over 16 connections, then 800 REQ queries with
mixed filters over 8 connections; every relay started from an empty database and received
the identical event set. All three relays returned byte-identical query results.

| Relay                              | Writes (events/s) | Reads (queries/s) |
| ---------------------------------- | ----------------- | ----------------- |
| simple-nostr-relay (Node 24)       | 1,960             | **966**           |
| nostr-rs-relay 0.10.0 (Rust/SQLite)| 3,215             | 273               |
| strfry 1.1.1 (C++/LMDB)            | **11,254**        | 749               |

Reads are the fastest of the three thanks to synchronous in-process SQLite (small-dataset
caveat applies). Writes are within reach of the Rust relay since schnorr verification moved
to WASM libsecp256k1 (`tiny-secp256k1`), roughly 3x faster than pure-JS verification.

`src/index.bun.ts` is an experimental Bun entrypoint using `bun:sqlite` (better-sqlite3
cannot load under Bun). It performs on par with the Node entrypoint at about half the memory;
Node remains the supported runtime.

## License

MIT