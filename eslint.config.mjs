import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  // Layering (see .ai/docs/engineering-standards.md §1)
  {
    files: ["packages/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@taskly/*"], message: "ui must not import other workspace packages." },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/core/**/*.{ts,tsx}"],
    ignores: ["packages/core/src/auth.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["next", "next/*", "react", "react-dom", "@taskly/app", "@taskly/ui"],
              message: "core must stay framework-free.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/db/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@taskly/core", "@taskly/core/*", "@taskly/app", "@taskly/ui"],
              message: "db must not import upper layers.",
            },
          ],
        },
      ],
    },
  },
  {
    // Client code must not pull server-only modules into the browser bundle.
    files: ["packages/app/**/*.{ts,tsx}"],
    ignores: ["packages/app/app/api/**", "packages/app/lib/api.ts", "packages/app/app/**/route.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@taskly/db", "@taskly/core/server"],
              message: "Import server-only code from Route Handlers or server modules only.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/app/**/*.{ts,tsx}"],
    ignores: ["packages/app/lib/api-client.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name='fetch']",
          message: "Use apiCall from lib/api-client.ts.",
        },
      ],
    },
  },
  { settings: { next: { rootDir: "packages/app" } } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    "**/.next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
