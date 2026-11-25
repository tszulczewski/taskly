import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { securityHeaders } from "./lib/security-headers";

const repoRoot = path.join(import.meta.dirname, "../..");

const nextConfig: NextConfig = {
  output: "standalone",
  // Repository root, so workspace packages are included in the standalone trace.
  outputFileTracingRoot: repoRoot,
  transpilePackages: ["@taskly/core", "@taskly/db", "@taskly/ui"],
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default function config(phase: string): NextConfig {
  // `next dev` runs in packages/app and reads only that directory's `.env`; the dev `.env`
  // lives at the repo root. Already-set variables win. Builds and the standalone server
  // get their environment from the caller (CI, systemd), never from a file.
  const devEnv = path.join(repoRoot, ".env");
  const dev = phase === PHASE_DEVELOPMENT_SERVER;
  if (dev && existsSync(devEnv)) {
    process.loadEnvFile(devEnv);
  }
  return {
    ...nextConfig,
    // Every response, page and API alike (threat T-07).
    headers: async () => [{ source: "/:path*", headers: securityHeaders({ dev }) }],
  };
}
