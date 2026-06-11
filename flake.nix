{
  description = "Simple Nostr Relay";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
          nodejs = pkgs.nodejs_22;
          nodeSources = pkgs.srcOnly nodejs;
          pnpm = pkgs.pnpm_9;
        in
        {
          default = pkgs.stdenv.mkDerivation (finalAttrs: {
            pname = "simple-nostr-relay";
            version = "0.0.0";

            src = ./.;

            pnpmDeps = pkgs.fetchPnpmDeps {
              inherit (finalAttrs) pname version src;
              inherit pnpm;
              fetcherVersion = 3;
              hash = "sha256-jM5WVQHH9+Ta949LxQwnaX4oshkLcIGFO6MR8FrLkqs=";
            };

            nativeBuildInputs = [
              pkgs.makeWrapper
              nodejs
              pkgs.pkg-config
              pkgs.pnpmConfigHook
              pnpm
              pkgs.python3
              pkgs.removeReferencesTo
            ]
            ++ pkgs.lib.optionals pkgs.stdenv.hostPlatform.isDarwin [
              pkgs.darwin.cctools
            ];

            buildPhase = ''
              runHook preBuild

              pushd node_modules/better-sqlite3
              npm run build-release --offline --nodedir="${nodeSources}"
              find build -type f -exec remove-references-to -t "${nodeSources}" {} \;
              popd

              runHook postBuild
            '';

            installPhase = ''
              runHook preInstall

              app_dir="$out/lib/simple-nostr-relay"
              mkdir -p "$app_dir" "$out/bin"
              cp -R package.json tsconfig.json src scripts drizzle otel node_modules "$app_dir/"

              cat > "$out/bin/simple-nostr-relay" <<EOF
#!${pkgs.runtimeShell}
set -euo pipefail
export PATH="${pkgs.lib.makeBinPath [ nodejs ]}:\$PATH"
run_dir="\$PWD"
export DATABASE_PATH="\''${DATABASE_PATH:-\$run_dir/database.sqlite}"
cd "$app_dir"
exec "$app_dir/node_modules/.bin/tsx" src/index.ts "\$@"
EOF

              cat > "$out/bin/simple-nostr-relay-migrate" <<EOF
#!${pkgs.runtimeShell}
set -euo pipefail
export PATH="${pkgs.lib.makeBinPath [ nodejs ]}:\$PATH"
run_dir="\$PWD"
export DATABASE_PATH="\''${DATABASE_PATH:-\$run_dir/database.sqlite}"
cd "$app_dir"
exec "$app_dir/node_modules/.bin/tsx" scripts/migrate.ts "\$@"
EOF

              chmod +x "$out/bin/simple-nostr-relay" "$out/bin/simple-nostr-relay-migrate"

              runHook postInstall
            '';

            meta = {
              description = "A simple Nostr relay written in TypeScript and Hono";
              mainProgram = "simple-nostr-relay";
            };
          });
        }
      );

      apps = forAllSystems (
        system:
        let
          package = nixpkgs.lib.getExe self.packages.${system}.default;
        in
        {
          default = {
            type = "app";
            program = package;
          };
          migrate = {
            type = "app";
            program = "${self.packages.${system}.default}/bin/simple-nostr-relay-migrate";
          };
        }
      );

      nixosModules.default =
        {
          config,
          lib,
          pkgs,
          ...
        }:
        let
          cfg = config.services.simple-nostr-relay;
          relayInformationFormat = pkgs.formats.json { };
        in
        {
          options.services.simple-nostr-relay = {
            enable = lib.mkEnableOption "Simple Nostr Relay";

            package = lib.mkOption {
              type = lib.types.package;
              default = self.packages.${pkgs.stdenv.hostPlatform.system}.default;
              defaultText = lib.literalExpression "simple-nostr-relay.packages.\${pkgs.stdenv.hostPlatform.system}.default";
              description = "The Simple Nostr Relay package to run.";
            };

            port = lib.mkOption {
              type = lib.types.port;
              default = 3000;
              description = "TCP port to listen on.";
            };

            databasePath = lib.mkOption {
              type = lib.types.path;
              default = "/var/lib/simple-nostr-relay/database.sqlite";
              description = "Path to the SQLite database.";
            };

            openFirewall = lib.mkOption {
              type = lib.types.bool;
              default = false;
              description = "Whether to open the relay port in the firewall.";
            };

            environment = lib.mkOption {
              type = lib.types.attrsOf lib.types.str;
              default = { };
              description = "Extra environment variables for the relay process.";
            };

            relayInformation = lib.mkOption {
              type = lib.types.submodule {
                freeformType = relayInformationFormat.type;
                options = {
                  name = lib.mkOption {
                    type = lib.types.str;
                    description = "Relay name.";
                  };

                  description = lib.mkOption {
                    type = lib.types.str;
                    description = "Relay description.";
                  };

                  pubkey = lib.mkOption {
                    type = lib.types.str;
                    description = "Relay operator public key.";
                  };

                  contact = lib.mkOption {
                    type = lib.types.str;
                    description = "Relay contact.";
                  };
                };
              };
              description = "Configurable NIP-11 relay information. supported_nips, software, and version are fixed by the application.";
              example = {
                name = "My Relay";
                description = "Personal Nostr relay";
                pubkey = "36d931a0c3e540393015c9ba9df8718b6259bf36180c9c4ef230ecc135c59c52";
                contact = "mailto:me@example.com";
              };
            };
          };

          config = lib.mkIf cfg.enable {
            assertions = [
              {
                assertion = !(cfg.relayInformation ? supported_nips);
                message = "services.simple-nostr-relay.relayInformation.supported_nips is fixed by the relay and cannot be configured.";
              }
              {
                assertion = !(cfg.relayInformation ? software);
                message = "services.simple-nostr-relay.relayInformation.software is fixed by the relay and cannot be configured.";
              }
              {
                assertion = !(cfg.relayInformation ? version);
                message = "services.simple-nostr-relay.relayInformation.version is fixed by the relay and cannot be configured.";
              }
            ];

            systemd.services.simple-nostr-relay = {
              description = "Simple Nostr Relay";
              wantedBy = [ "multi-user.target" ];
              after = [ "network.target" ];

              environment = cfg.environment // {
                DATABASE_PATH = toString cfg.databasePath;
                PORT = toString cfg.port;
                RELAY_INFORMATION_FILE = "${relayInformationFormat.generate "simple-nostr-relay-information.json" cfg.relayInformation}";
              };

              serviceConfig = {
                DynamicUser = true;
                ExecStart = "${cfg.package}/bin/simple-nostr-relay";
                ExecStartPre = "${cfg.package}/bin/simple-nostr-relay-migrate";
                Restart = "on-failure";
                StateDirectory = "simple-nostr-relay";
                Type = "simple";
                WorkingDirectory = "/var/lib/simple-nostr-relay";
              };
            };

            networking.firewall.allowedTCPPorts = lib.mkIf cfg.openFirewall [ cfg.port ];
          };
        };

      devShells = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
          default = pkgs.mkShell {
            packages = [
              pkgs.nodejs_22
              pkgs.pnpm_9
              pkgs.pkg-config
              pkgs.python3
              pkgs.sqlite
            ];
          };
        }
      );
    };
}
