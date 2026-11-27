// Starts the built Worker locally for the smoke tests (`npm run build:worker` first), the way CI
// does: Postgres from WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE (or wrangler.jsonc's
// localConnectionString), dummy secrets, and sign-in emails logged instead of sent
// (NEXTJS_ENV=development), which is how the tests read their verification links.
import { spawn } from "node:child_process";
import { appendFileSync, existsSync, rmSync, writeFileSync } from "node:fs";

const logPath = process.env.E2E_SERVER_LOG ?? "e2e/server.log";
// The tests read sign-in emails from this file, so the server's output goes straight to it, written
// at once. It used to be echoed to stdout first, through the pipe Playwright opens; on 2026-11-27 the
// log stopped growing part-way through a CI run (most likely that pipe stalled) and an email test
// timed out. Set E2E_SERVER_ECHO=1 to also see the output in the terminal.
writeFileSync(logPath, "");
const echo = Boolean(process.env.E2E_SERVER_ECHO);

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

// wrangler.e2e.jsonc has no staging route (wrangler dev would present staging.sunsetsoul.app to the
// app, which Better Auth rejects as an origin) and no Workers AI binding (it needs a Cloudflare login).
const args = ["opennextjs-cloudflare", "preview", "-c", "wrangler.e2e.jsonc", "--", "--port", "8787"];
const child = spawn("npx", args, { stdio: ["ignore", "pipe", "pipe"] });
for (const stream of [child.stdout, child.stderr]) {
  stream.on("data", (chunk) => {
    appendFileSync(logPath, chunk);
    if (echo) process.stdout.write(chunk);
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
