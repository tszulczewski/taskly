import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/**
 * The prototype's navigation tests. Kept apart from the root config: the prototype is not a
 * workspace package and is not part of the app's 100% coverage gate.
 * Run from the repo root: `npx vitest run --config prototypes/task-list-v1/vitest.config.mts`.
 */
export default defineConfig({
  root: here("."),
  resolve: { alias: { "@taskly/ui": here("../../packages/ui/src/index.ts") } },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    testTimeout: 15000,
  },
});
