import { defineConfig } from "@playwright/test";

// Smoke tests. By default they start the built Worker locally (see e2e/start-server.mjs); with
// E2E_BASE_URL set they run against that deployment instead (the staging deploy workflow does).
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:8787";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "retain-on-failure" },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "node e2e/start-server.mjs", url: `${baseURL}/api/health`, timeout: 180_000, reuseExistingServer: !process.env.CI },
});
