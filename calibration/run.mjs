// Scores the calibration set with one or more vision providers and compares the results with
// the labels in manifest.json.
//
// Needs the scoring Worker running locally with its dev endpoint enabled:
//   cd apps/scorer && npx wrangler dev --port 8788      (.dev.vars: ENABLE_DEV_ENDPOINT=true)
// Then:
//   node calibration/run.mjs --providers anthropic,gemma,gemma-fast
//
// Writes results/<timestamp>.json and report.md next to this script.
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => (arg.startsWith("--") ? [...pairs, [arg.slice(2), all[i + 1]]] : pairs), []),
);
const providers = (args.providers ?? "anthropic").split(",");
const scorerUrl = args.url ?? "http://localhost:8788";
const concurrency = Number(args.concurrency ?? 3);

// USD per million tokens (input, output). Claude: Anthropic pricing; Gemma: Workers AI pricing.
const PRICES = { anthropic: [0.1, 0.5], gemma: [0.1, 0.3], "gemma-fast": [0.1, 0.3] };
const PARAMS = ["palette", "reach", "setting", "wow"];

const manifest = JSON.parse(await readFile(join(here, "manifest.json"), "utf8"));
const cacheDir = join(here, ".cache");
await mkdir(cacheDir, { recursive: true });

async function photoBytes(photo) {
  const path = join(cacheDir, `${photo.id}.jpg`);
  try {
    await access(path);
  } catch {
    const response = await fetch(photo.image, { headers: { "User-Agent": "SunsetSoulCalibration/0.1 (https://sunsetsoul.app)" } });
    if (!response.ok) throw new Error(`Download failed for ${photo.id}: ${response.status}`);
    await writeFile(path, Buffer.from(await response.arrayBuffer()));
  }
  return readFile(path);
}

async function score(provider, photo) {
  const body = await photoBytes(photo);
  for (let attempt = 1; ; attempt++) {
    const started = Date.now();
    const response = await fetch(`${scorerUrl}/dev/score?provider=${provider}`, { method: "POST", body });
    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      result = { error: text.slice(0, 200) };
    }
    if (response.ok || attempt === 2) return { ...result, ms: Date.now() - started };
  }
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    }),
  );
  return results;
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const fixed = (n, digits = 2) => (Number.isFinite(n) ? n.toFixed(digits) : "–");

const runs = {};
for (const provider of providers) {
  process.stdout.write(`Scoring ${manifest.photos.length} photos with ${provider}…`);
  runs[provider] = await mapLimit(manifest.photos, concurrency, async (photo) => ({ photo, result: await score(provider, photo) }));
  process.stdout.write(" done\n");
}

function summarise(provider, rows) {
  const errors = Object.fromEntries(PARAMS.map((p) => [p, []]));
  const compositeErrors = [];
  let sunsetRight = 0, sunsetMissed = 0, falseSunset = 0, failures = 0;
  const tokensIn = [], tokensOut = [], latency = [];
  for (const { photo, result } of rows) {
    if (result.error) { failures++; continue; }
    latency.push(result.ms);
    tokensIn.push(result.details.usage.inputTokens ?? 0);
    tokensOut.push(result.details.usage.outputTokens ?? 0);
    const said = result.details.scene.is_sunset;
    if (photo.labels.is_sunset && said) sunsetRight++;
    else if (photo.labels.is_sunset) sunsetMissed++;
    else if (said) falseSunset++;
    else sunsetRight++;
    if (photo.labels.is_sunset && result.status === "done") {
      for (const p of PARAMS) errors[p].push(Math.abs(result.scores[p] - photo.labels[p]));
      const labelled = PARAMS.reduce((sum, p) => sum + photo.labels[p], 0) / 4;
      compositeErrors.push(Math.abs(result.scores.composite - labelled) * 10);
    }
  }
  const [pin, pout] = PRICES[provider];
  const cost = (mean(tokensIn) * pin + mean(tokensOut) * pout) / 1e6;
  return {
    provider,
    model: rows.find((r) => r.result.details)?.result.details.model,
    sunsetAccuracy: sunsetRight / (rows.length - failures),
    sunsetMissed,
    falseSunset,
    failures,
    mae: Object.fromEntries(PARAMS.map((p) => [p, mean(errors[p])])),
    compositeMae100: mean(compositeErrors),
    latencyMs: { mean: mean(latency), p90: [...latency].sort((a, b) => a - b)[Math.floor(latency.length * 0.9)] },
    tokens: { input: mean(tokensIn), output: mean(tokensOut) },
    costPerPhoto: cost,
  };
}

const summaries = providers.map((p) => summarise(p, runs[p]));
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
await mkdir(join(here, "results"), { recursive: true });
await writeFile(join(here, "results", `${stamp}.json`), JSON.stringify({ summaries, runs }, null, 2));

// Palette and Reach come from pixels, so they're the same for every provider.
const lines = [
  "# Scorer calibration report",
  "",
  `Run ${new Date().toISOString()} · ${manifest.photos.length} photos (${manifest.photos.filter((p) => p.labels.is_sunset).length} sunsets) · labels are drafts until reviewed.`,
  "",
  "| Provider | Model | Sunset? correct | Missed | False | Failed | Palette MAE | Reach MAE | Setting MAE | Wow MAE | Score MAE (/100) | Mean latency | p90 | Cost / photo |",
  "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
  ...summaries.map(
    (s) =>
      `| ${s.provider} | ${s.model} | ${fixed(s.sunsetAccuracy * 100, 0)}% | ${s.sunsetMissed} | ${s.falseSunset} | ${s.failures} | ${fixed(s.mae.palette)} | ${fixed(s.mae.reach)} | ${fixed(s.mae.setting)} | ${fixed(s.mae.wow)} | ${fixed(s.compositeMae100, 1)} | ${fixed(s.latencyMs.mean / 1000, 1)} s | ${fixed(s.latencyMs.p90 / 1000, 1)} s | $${fixed(s.costPerPhoto * 1000, 2)} per 1,000 |`,
  ),
  "",
  "MAE = mean absolute error against the labels, on a 1–10 scale (score MAE on the 10–100 display scale). Pass bar: ≤ 1.5 per parameter, every non-sunset caught.",
  "",
  "## Per photo",
  "",
  `| Photo | Label (P/R/S/W) | ${providers.map((p) => `${p} (P/R/S/W · phenomena)`).join(" | ")} |`,
  `|---|---|${providers.map(() => "---").join("|")}|`,
  ...manifest.photos.map((photo, i) => {
    const label = photo.labels.is_sunset ? PARAMS.map((p) => photo.labels[p]).join("/") : "not a sunset";
    const cells = providers.map((p) => {
      const r = runs[p][i].result;
      if (r.error) return `error: ${r.error.slice(0, 60)}`;
      if (r.status === "not_sunset") return "not a sunset";
      const seen = r.details.scene.phenomena.map((x) => `${x.kind}${x.confidence === "possible" ? "?" : ""}`).join(", ") || "–";
      return `${PARAMS.map((k) => r.scores[k]).join("/")} · ${seen}`;
    });
    return `| ${photo.id} | ${label} | ${cells.join(" | ")} |`;
  }),
  "",
];
await writeFile(join(here, "report.md"), lines.join("\n"));
console.log(lines.slice(4, 6 + summaries.length).join("\n"));
