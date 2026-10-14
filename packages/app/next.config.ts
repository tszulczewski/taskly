import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Repository root, so workspace packages are included in the standalone trace.
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
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

export default nextConfig;
