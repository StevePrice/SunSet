import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ["@sunset/db", "@sunset/scoring"],
  // Cache Components and partial prerendering are off: on the Workers runtime (OpenNext) pages
  // using them hang. Revisit when OpenNext supports them.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Makes Cloudflare bindings (Hyperdrive, R2, Workers AI) available to `next dev`. Only in dev: the
// Workers AI binding is always remote, and connecting to it during `next build` needs a Cloudflare
// login, which CI doesn't have.
export default function config(phase: string): NextConfig {
  if (phase === PHASE_DEVELOPMENT_SERVER) initOpenNextCloudflareForDev();
  return nextConfig;
}
