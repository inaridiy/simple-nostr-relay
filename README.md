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
- [x] NIP-26: [Event Delegation](https://github.com/nostr-protocol/nips/blob/master/26.md)
- [ ] NIP-42: [Authentication of clients to relays](https://github.com/nostr-protocol/nips/blob/master/42.md)
- [x] NIP-45: [Event Counts](https://github.com/nostr-protocol/nips/blob/master/45.md)

## Quickstart

```bash
pnpm install # Install dependencies
pnpm migrate # Create database
pnpm run dev # Start the relay
```

## Nix

Use it as a NixOS service:

```nix
{
  inputs.simple-nostr-relay.url = "github:yutakobayashidev/simple-nostr-relay";

  outputs =
    { nixpkgs, simple-nostr-relay, ... }:
    {
      nixosConfigurations.example = nixpkgs.lib.nixosSystem {
        system = "x86_64-linux";
        modules = [
          simple-nostr-relay.nixosModules.default
          {
            services.simple-nostr-relay = {
              enable = true;
              port = 3000;
              openFirewall = true;
              relayInformation = {
                name = "My Relay";
                description = "Personal Nostr relay";
                pubkey = "36d931a0c3e540393015c9ba9df8718b6259bf36180c9c4ef230ecc135c59c52";
                contact = "mailto:me@example.com";
              };
            };
          }
        ];
      };
    };
}
```

The service stores its SQLite database at `/var/lib/simple-nostr-relay/database.sqlite` by default and runs migrations before starting.
`relayInformation` is required. `supported_nips`, `software`, and `version` are fixed by the relay.

For local development:

```bash
nix develop
pnpm install
pnpm migrate
pnpm run dev
```

You can also build and run it directly:

```bash
nix build
DATABASE_PATH="$PWD/database.sqlite" nix run .#migrate
RELAY_INFORMATION_FILE="$PWD/relay-information.json" DATABASE_PATH="$PWD/database.sqlite" nix run
```

`DATABASE_PATH` defaults to `database.sqlite`.

## License

MIT
