import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    globalSetup: ["./vitest.global-setup.ts"],
    // The database tests share one database, and some (admin's "rescore all") look at every
    // entry, so files running in parallel could delete rows under each other. Run files one at a
    // time; the whole suite still takes a few seconds.
    fileParallelism: false,
  },
});
