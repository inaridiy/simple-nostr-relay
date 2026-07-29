import { fileURLToPath } from "node:url";
import { rayon } from "rayon-ts/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [rayon({ external: ["tiny-secp256k1", "tiny-secp256k1/*"] })],
  resolve: {
    alias: {
      "@/validators": fileURLToPath(new URL("./src/generated/typia", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    ssr: "src/index.ts",
    target: "node20.19",
    sourcemap: true,
  },
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
