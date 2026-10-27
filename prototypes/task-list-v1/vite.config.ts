import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/**
 * Builds the prototype into the folder Storybook serves (`staticDirs: ["./public"]`), so it opens
 * at /prototypes/task-list/index.html. The design system is used as source, never copied.
 */
export default defineConfig({
  root: here("."),
  base: "./",
  plugins: [tailwindcss()],
  resolve: { alias: { "@taskly/ui": here("../../packages/ui/src/index.ts") } },
  build: {
    outDir: here("../../packages/ui/.storybook/public/prototypes/task-list"),
    emptyOutDir: true,
    rolldownOptions: {
      // React's "use client" marks mean nothing in a static bundle.
      onwarn(warning, warn) {
        if (warning.code !== "MODULE_LEVEL_DIRECTIVE") warn(warning);
      },
    },
  },
});
