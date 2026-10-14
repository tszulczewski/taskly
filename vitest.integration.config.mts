import { defineConfig } from "vitest/config";

// Integration tests: real PostgreSQL (Testcontainers, or TEST_DATABASE_URL) and the built app.
export default defineConfig({
  resolve: {
    alias: { "server-only": new URL("./vitest.server-only.ts", import.meta.url).pathname },
  },
  test: {
    include: ["packages/**/*.integration.test.ts", "test/**/*.integration.test.ts"],
    globalSetup: ["./test/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 180_000,
  },
});
