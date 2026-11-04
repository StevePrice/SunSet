// Loads the reference photos into the app for the admin rating page: resizes each photo, uploads
// it to R2 at calibration/{id}.jpg, and upserts calibration_photos with the latest scorer results
// (results/*.json from run.mjs, provider "anthropic").
//
//   DATABASE_URL=... node calibration/seed.mjs            # local R2 (wrangler dev)
//   DATABASE_URL=... node calibration/seed.mjs --remote   # staging R2
//
// macOS only (uses sips to resize).
import { execFileSync } from "node:child_process";
import { mkdir, readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const remote = process.argv.includes("--remote");
const require = createRequire(join(here, "../apps/web/package.json"));
const { Client } = require("pg");

const manifest = JSON.parse(await readFile(join(here, "manifest.json"), "utf8"));
const latest = (await readdir(join(here, "results"))).filter((f) => f.endsWith(".json")).sort().at(-1);
const run = JSON.parse(await readFile(join(here, "results", latest), "utf8"));
const byId = new Map((run.runs.anthropic ?? []).map(({ photo, result }) => [photo.id, result]));
// Run seed.mjs right after run.mjs, so the results match the scorer version in the source.
const scorerVersion = (await readFile(join(here, "../packages/scoring/src/index.ts"), "utf8")).match(/SCORER_VERSION = "([^"]+)"/)[1];
console.log(`Scores from results/${latest} (scorer ${scorerVersion})`);

const webDir = join(here, ".cache", "web");
await mkdir(webDir, { recursive: true });
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

for (const photo of manifest.photos) {
  const source = join(here, ".cache", `${photo.id}.jpg`);
  const resized = join(webDir, `${photo.id}.jpg`);
  execFileSync("sips", ["-Z", "1600", "-s", "format", "jpeg", "-s", "formatOptions", "82", source, "--out", resized], { stdio: "ignore" });
  execFileSync(
    "npx",
    ["wrangler", "r2", "object", "put", `sunset-photos/calibration/${photo.id}.jpg`, "--file", resized, "--content-type", "image/jpeg", remote ? "--remote" : "--local"],
    { cwd: join(here, "../apps/web"), stdio: "ignore" },
  );

  const result = byId.get(photo.id);
  const model = result?.details
    ? {
        scorerVersion,
        isSunset: result.status !== "not_sunset",
        ...(result.scores ?? {}),
        wowReason: result.details.scene?.wow?.reason,
      }
    : null;
  await client.query(
    `insert into calibration_photos (id, title, credit, source_url, is_sunset, model)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (id) do update set title = $2, credit = $3, source_url = $4, is_sunset = $5, model = $6`,
    [photo.id, photo.note, `${photo.author} · ${photo.license}`, photo.source, photo.labels.is_sunset, model],
  );
  console.log(`${photo.id}: ${model ? `wow ${model.wow ?? "–"}` : "no score"}`);
}
await client.end();
