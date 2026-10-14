import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  resolve: {
    // `server-only` throws outside the Next.js server bundle; stub it for tests.
    alias: { "server-only": new URL("./vitest.server-only.ts", import.meta.url).pathname },
  },
  test: {
    include: ["packages/**/*.test.ts"],
    // Integration tests need DATABASE_URL (from .env); they skip without it.
    env: loadEnv(mode, process.cwd(), ""),
  },
}));
