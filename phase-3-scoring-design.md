# Sunset Soul — Phase 3 Design: Scoring v1
**Status:** Built and deployed to staging (2026-11-02). Decisions: TypeScript scoring Worker; both vision providers compared (§7); pixel analysis at 960 px; display 10–100; labels drafted for review; non-sunsets kept unscored.
**Companion docs:** [app-strategy-phases.md](app-strategy-phases.md), [sunset-soul-prd.md](sunset-soul-prd.md) §6.4, [sunset-soul-concept.md](sunset-soul-concept.md) (Sunset Scoring Algorithm)

---

## 1. What Phase 3 delivers

Every saved sunset gets an automatic score: four parameters from 1 to 10 (Palette, Reach, Setting, Wow Factor) and a composite shown out of 100. The score appears a few seconds after saving, on a Score Result view, on the entry page, and as a badge in the Journal.

**Done when:** a newly saved entry shows its score within about 10 seconds, and on a labelled test set of about 30 sunsets the scores are close to human judgement (see §8).

**Out of scope (later phases):** community or audience scores, weighting the composite, a trained model, and using the score for map retention (Phase 5 consumes it).

## 2. Design summary

| Parameter | How it's measured | Where |
|---|---|---|
| **Palette** | Pixel analysis: hue variety and saturation of the coloured pixels | Our code (free, deterministic) |
| **Reach** | Pixel analysis: share of the frame in sunset colours vs. neutral or dark | Our code (free, deterministic) |
| **Setting** | Vision model: classifies the foreground (mountains, ocean, skyline, trees, open horizon) and rates it against the 1/5/10 anchors | Vision model |
| **Wow Factor** | Vision model detects phenomena (rays, reflection, halo, green flash, iridescent clouds); **our code** turns the checklist into the score | Model detects, code scores |
| **Composite** | Simple average of the four, × 10 → shown as 10–100 | Our code |

The same model call also answers two questions later phases need: **is this a sunset (or sunrise) at all?** and **is it safe to show publicly?**

## 3. Architecture change from the original plan (decision needed)

The phases doc planned a **Python scorer on Cloudflare Containers**. For v1 I recommend instead a **small TypeScript Worker that consumes a Queue**:

```
Save entry (sunset-staging Worker)
   │  insert entry + enqueue {entryId}
   ▼
Cloudflare Queue "sunset-scoring"  (retries, dead-letter queue)
   ▼
Scoring Worker "sunset-scorer"
   ├─ R2: read the thumbnail (pixel metrics) and display photo (vision model)
   ├─ Palette + Reach: decode JPEG (WASM) and compute in TypeScript
   ├─ Setting + Wow: vision model call (structured JSON output)
   └─ Hyperdrive → Postgres: write the score row
   ▲
Entry page polls /api/entries/{id}/score until it's ready
```

**Why change:**
- Palette and Reach are simple statistics over a 960 px copy of the photo: about 60 ms to decode and 10 ms to measure in TypeScript, with no OpenCV needed for v1.
- One language and one deploy pipeline; no container image builds, cold starts or container billing.
- The Python service stays useful for **v2** (a trained model, horizon or foreground segmentation), where Python's computer-vision tools matter.

**Trade-off:** if v2 needs Python, we bring the container back then. The interface between the queue and the scorer stays the same, so it's a contained change.

**Why a Queue rather than doing it in the upload request:** retries if the model call fails, a dead-letter queue for photos that keep failing, controlled concurrency, and the upload stays fast. Queues are included in Workers Paid.

## 4. Scoring details

### 4.1 Palette (pixel analysis)
1. Decode the 2560 px display photo, downscale it to 960 px on the long edge (box filter), and convert each pixel to HSV.
2. **Coloured pixels:** saturation ≥ 0.20 and brightness ≥ 0.15. Everything else is neutral or dark.
3. **Hue variety:** count the 30° hue bins holding at least 3% of the coloured pixels.
4. **Vividness:** mean saturation of the coloured pixels.
5. **Score:** combine variety and vividness and map to 1–10, using the concept doc's anchors as calibration points:
   - **1:** one muted colour, low saturation
   - **5:** a couple of clear colours, moderately vivid
   - **10:** a wide range of vivid, well-blended colours

### 4.2 Reach (pixel analysis)
1. **Sunset colour:** hue in the red-orange-yellow range (about 340°–60°) plus pink-magenta-purple (about 260°–340°), with saturation ≥ 0.25 and brightness ≥ 0.20.
2. **Reach fraction:** sunset-colour pixels ÷ all pixels.
3. **Score:** piecewise linear through the anchors:
   - ≤ 5% of the frame → **1**
   - 50% → **5**
   - ≥ 90% → **10**

The thresholds are starting values, tuned on the test set (§8). They live in one versioned module, so changing them means a new scorer version (§5).

### 4.3 Setting (vision model)
The model returns:
- the foreground **type**: `mountains`, `ocean`, `lake_or_river`, `skyline`, `trees`, `open_horizon` or `other`
- a 1–10 rating against the anchors:
  - **1:** nothing distinct, flat or empty foreground
  - **5:** recognisable but unremarkable
  - **10:** a striking, well-composed silhouette that adds drama
- a one-sentence reason, shown to the user

### 4.4 Wow Factor (model detects, code scores)
The model returns a **checklist**:
- `sun_rays`
- `reflection`
- `halo`
- `green_flash`
- `iridescent_clouds`
- `other_rare`, with a description

Each item comes with a confidence (`clear` or `possible`). Our code applies the concept doc's checklist rule, so scores stay consistent across model changes:

| Clearly visible phenomena | Wow score |
|---|---|
| 0 | 1 (2–3 if only `possible` detections) |
| 1 | 5 (6 if the model marks it striking) |
| 2 | 8 |
| 3 or more | 10 |

### 4.5 Composite
- **Composite:** (Palette + Reach + Setting + Wow) ÷ 4, stored with two decimals.
- **Display score:** round(composite × 10), shown as **10–100**.
- Weighting the parameters stays a v2 refinement, as the PRD says.

### 4.6 Not a sunset / unsafe
- **Not a sunset:** the entry stays in the Journal, since it's still the user's memory, but it isn't scored. The page says "This doesn't look like a sunset, so it wasn't scored." Sunrises count as sunsets.
- **Unsafe:** `content_flag` is stored. Nothing changes in the private Journal; Phase 5 blocks such photos from the public map.

## 5. Data model

New table `entry_scores`, one row per entry per scorer version, so re-scoring keeps history and versions can be compared:

| Column | Notes |
|---|---|
| `entry_id`, `scorer_version` | Primary key; entry deleted → cascade |
| `status` | `pending`, `done`, `not_sunset`, `failed` |
| `palette`, `reach`, `setting`, `wow` | 1–10 |
| `composite` | numeric(4,2) |
| `display_score` | 10–100 |
| `details` | JSON: pixel metrics, setting type and reason, phenomena list and reason, `is_sunset`, `content_flag`, model ID, token usage |
| `attempts`, `error` | For retries and the dead-letter queue |
| `created_at`, `scored_at` | |

- **Current score:** the row for the active `SCORER_VERSION` (configured, starting at `v1.0`).
- **Re-scoring:** a script enqueues entries for a new version. That also covers backfilling the entries saved in Phase 2.

## 6. User experience

1. **After Save:** the entry page opens with "Scoring your sunset…" in place of the score card and polls every 1.5 seconds until the score is ready.
2. **Score Result:** a large **72**-style number, four labelled bars with their 1–10 values, the Setting type and its reason, and the detected phenomena listed ("Sun rays · Reflection").
3. **Journal grid:** a small score badge on each thumbnail.
4. **If scoring fails** after retries: "We couldn't score this one" with a **Try again** button that re-enqueues it.
5. **Explaining the score:** a short line under the bars: "Palette and Reach are measured from your photo's colours; Setting and Wow Factor are judged by AI."

Share cards (Phase 4) reuse the same score component.

## 7. Vision model (decision needed)

| Option | Cost per photo | Notes |
|---|---|---|
| **Claude Haiku 5.5** (`claude-haiku-5-5`), recommended | ≈ $0.0003 (≈ $0.30 per 1,000) | Best at spotting subtle phenomena; reliable structured JSON. Needs an Anthropic API key |
| Cloudflare Workers AI: Gemma 4 26B | ≈ $0.0003, and about 300+ photos/day free | No new account; quality on subtle phenomena unproven |

- **Interface:** the model sits behind a small interface (`detectScene(image) → {isSunset, contentFlag, setting, phenomena}`), so switching providers is a configuration change.
- **Comparison:** I'll run both on the test set and report the results before we commit.
- **Call details for Claude:**
  - the display photo (≤ 2560 px; the API downsizes it)
  - a system prompt with the anchors
  - structured output (a JSON schema) at `effort: "low"`
  - a refusal is treated as a failed scoring, with no retry

**Privacy:** only the re-encoded photo is sent. It has no location metadata, and the story and user details aren't included. The Phase 6 privacy policy will name the AI provider.

**Cost guard:** at most 50 scorings per user per day, and a cap on queue concurrency.

## 8. Testing and calibration

- **Unit tests:**
  - pixel metrics on synthetic images (flat grey → Palette 1, Reach 1; a full-frame orange-pink gradient → high Reach and Palette)
  - the anchor mappings, the Wow checklist rule, and the composite
- **Database tests:**
  - score rows are private to the entry's owner
  - scoring is idempotent: a re-delivered queue message doesn't double-write
- **Test set:** about 30 sunsets plus about 5 non-sunsets.
  - **Photos:** yours, plus public-domain or CC0 photos (Wikimedia Commons), covering muted, vivid, ocean, city, rays and reflections.
  - **Labels:** you label each photo with 1–10 per parameter. I can draft labels for you to adjust.
  - **Pass bar:** mean absolute error ≤ 1.5 per parameter, and every non-sunset detected.
  - **Repeatable:** a script reruns the set whenever thresholds, prompts or models change, and reports the error per parameter.
- **End to end:** the existing browser test is extended: save → the score appears → the values are shown.

## 9. Build order

1. `entry_scores` migration, data-access functions and tests.
2. Pixel metrics (Palette, Reach) with WASM JPEG decoding, plus unit tests.
3. Vision model interface, Claude implementation, and the Wow and composite mapping.
4. `sunset-scorer` Worker (Queue consumer), Queue and dead-letter queue, and the enqueue on save.
5. Score API and UI (polling, Score Result, Journal badge, Try again).
6. Test set, calibration script, and the Claude vs. Gemma comparison. Tune the thresholds.
7. Deploy to staging, backfill your 3 existing entries, then test on your phone.

## 10. Decisions for you

1. **Architecture:** TypeScript scoring Worker for v1 (recommended), or the original Python container plan?
2. **Vision model:** Claude Haiku 5.5 (recommended, needs an API key) or Cloudflare Gemma 4, with the comparison run either way?
3. **Display scale:** 10–100 (recommended), or 1–10 with one decimal (for example 7.2)?
4. **Test set labels:** will you label about 30 photos, or should I draft labels for you to adjust?
5. **Non-sunsets:** keep them in the Journal unscored (recommended), or refuse to save them?

## 11. Calibration results (2026-11-02)

Run on 31 Wikimedia Commons photos (27 sunsets, 4 non-sunsets), against draft labels (`calibration/report.md` has the per-photo table). Palette and Reach come from pixels, so they're the same for every provider.

| Provider | Sunset detection | Palette | Reach | Setting | Wow | Score error (/100) | Mean latency | Cost per 1,000 |
|---|---|---|---|---|---|---|---|---|
| Claude Haiku 5.5 | 90%: missed 2 iridescent-cloud shots, called a dusk cityscape a sunset | 1.08 | 1.20 | 0.88 | 1.00 | 6.2 | 3.1 s | $0.75 |
| Gemma 4, no reasoning | 97%: called a daytime landscape a sunset | 1.00 | 1.22 | 0.85 | 1.30 | 6.7 | 3.9 s | $0.14 |
| Gemma 4, reasoning | 97%: same daytime miss | 1.00 | 1.22 | 0.78 | 1.26 | 6.4 | 25.6 s | $0.42 |

Errors are mean absolute error on the 1–10 scale. Every parameter is within the 1.5 pass bar for all three; no provider caught every non-sunset.

**Decision (2026-11-02): Claude Haiku 5.5** is the vision provider. It's faster, better on Wow Factor, and its misses were judgement calls rather than a daytime photo scored as a sunset. Gemma 4 without reasoning stays available by setting `VISION_PROVIDER` to `gemma-fast` in `apps/scorer/wrangler.jsonc`.
