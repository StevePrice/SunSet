// Starts the built Worker locally for the smoke tests (`npm run build:worker` first), the way CI
// does: Postgres from WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE (or wrangler.jsonc's
// localConnectionString), dummy secrets, and sign-in emails logged instead of sent
// (NEXTJS_ENV=development), which is how the tests read their verification links.
import { spawn } from "node:child_process";
import { createWriteStream, existsSync, rmSync, writeFileSync } from "node:fs";

const logPath = process.env.E2E_SERVER_LOG ?? "e2e/server.log";
const log = createWriteStream(logPath);

// Never replace a developer's own .dev.vars; only write (and later remove) our own.
const wroteVars = !existsSync(".dev.vars");
if (wroteVars) {
  writeFileSync(
    ".dev.vars",
    [
      "NEXTJS_ENV=development",
      "BETTER_AUTH_URL=http://localhost:8787",
      "BETTER_AUTH_SECRET=ci-only-secret-ci-only-secret-ci-only-1234",
      "ANTHROPIC_API_KEY=ci-dummy-never-used",
      "",
    ].join("\n"),
  );
}

// wrangler.jsonc routes the Worker to staging.sunsetsoul.app, and wrangler dev then presents that
// host to the app, which Better Auth rejects as an origin. --local-upstream keeps it on localhost.
const args = ["opennextjs-cloudflare", "preview", "--", "--port", "8787", "--local-upstream", "localhost:8787"];
const child = spawn("npx", args, { stdio: ["ignore", "pipe", "pipe"] });
for (const stream of [child.stdout, child.stderr]) {
  stream.on("data", (chunk) => {
    process.stdout.write(chunk);
    log.write(chunk);
  });
}
function stop() {
  child.kill("SIGTERM");
  if (wroteVars) rmSync(".dev.vars", { force: true });
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
child.on("exit", (code) => {
  if (wroteVars) rmSync(".dev.vars", { force: true });
  process.exit(code ?? 0);
});
