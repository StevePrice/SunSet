import type { NextConfig } from "next";
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

export default nextConfig;

// Makes Cloudflare bindings (Hyperdrive, R2) available to `next dev`.
initOpenNextCloudflareForDev();
