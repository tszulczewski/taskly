import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import remarkGfm from "remark-gfm";
import { mergeConfig } from "vite";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const publicDir = fileURLToPath(new URL("./public", import.meta.url));

const config: StorybookConfig = {
  stories: [
    "./docs/**/*.mdx",
    "./docs/**/*.stories.@(ts|tsx)",
    "../src/**/*.mdx",
    "../src/**/*.stories.@(ts|tsx)",
  ],
  addons: [
    {
      name: "@storybook/addon-docs",
      // Without remark-gfm, Markdown tables in MDX render as raw text.
      options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } },
    },
    "@storybook/addon-a11y",
    "@storybook/addon-vitest",
  ],
  framework: { name: "@storybook/react-vite", options: {} },
  // `public` holds only git-ignored copies of prototypes, so it is missing on a fresh checkout (CI).
  staticDirs: existsSync(publicDir) ? [publicDir] : [],
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
  features: {
    sidebarOnboardingChecklist: false,
    menuOnboardingChecklist: false,
    // Surfaces come from tokens; Storybook's background switcher would bypass the theme.
    backgrounds: false,
  },
  viteFinal: (viteConfig) => mergeConfig(viteConfig, { plugins: [tailwindcss()] }),
};

export default config;
