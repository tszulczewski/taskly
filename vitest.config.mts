import { defineConfig } from "vitest/config";

const serverOnlyStub = new URL("./vitest.server-only.ts", import.meta.url).pathname;

// Unit tests: fast, no database, no network. Coverage must stay at 100%.
export default defineConfig({
  resolve: {
    // `server-only` throws outside the Next.js server bundle; stub it for tests.
    alias: { "server-only": serverOnlyStub },
  },
  test: {
    include: ["packages/**/*.test.{ts,tsx}"],
    exclude: ["**/*.integration.test.ts", "**/node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      include: [
        "packages/*/src/**/*.{ts,tsx}",
        "packages/app/lib/**/*.{ts,tsx}",
        "packages/app/components/**/*.{ts,tsx}",
        "packages/app/app/**/route.ts",
      ],
      exclude: [
        "**/*.test.{ts,tsx}",
        // Next.js page/layout glue (fonts, markup): exercised by the browser integration tests.
        "packages/app/app/layout.tsx",
        "packages/app/app/page.tsx",
      ],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
