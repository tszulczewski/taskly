import path from "node:path";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const configDir = path.join(import.meta.dirname, ".storybook");

// Every story runs as a test (render, play function, axe with a11y.test = "error") once per theme.
const themeProject = (theme: "dark" | "light") => ({
  extends: true,
  plugins: [storybookTest({ configDir, initialGlobals: { theme } })],
  test: {
    name: `storybook-${theme}`,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({}),
      instances: [{ browser: "chromium" as const }],
    },
  },
});

export default defineConfig({
  test: { projects: [themeProject("dark"), themeProject("light")] },
});
