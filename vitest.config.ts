import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "lib/**/*.test.ts",
      "lib/**/*.test.tsx",
      "components/**/*.test.ts",
      "components/**/*.test.tsx",
    ],
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // Next.js ships `server-only` as a runtime guard. The package
      // throws on client-side import, but in vitest we run modules
      // outside Next's compiler so the guard would error before the
      // test runs. Stub it with the empty noop the Next compiler swaps
      // in for server bundles.
      "server-only": path.resolve(__dirname, "lib/test/server-only.ts"),
    },
  },
});
