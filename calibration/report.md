# Scorer calibration report

Run 2026-11-03T02:25:40.628Z · 31 photos (27 sunsets) · labels are drafts until reviewed.

| Provider | Model | Sunset? correct | Missed | False | Failed | Palette MAE | Reach MAE | Setting MAE | Wow MAE | Score MAE (/100) | Mean latency | p90 | Cost / photo |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| anthropic | claude-haiku-5-5 | 90% | 2 | 1 | 0 | 1.08 | 1.20 | 0.88 | 1.00 | 6.2 | 3.1 s | 4.4 s | $0.75 per 1,000 |
| gemma-fast | @cf/google/gemma-4-26b-a4b-it (no reasoning) | 97% | 0 | 1 | 0 | 1.00 | 1.22 | 0.85 | 1.30 | 6.7 | 3.9 s | 5.3 s | $0.14 per 1,000 |
| gemma | @cf/google/gemma-4-26b-a4b-it | 97% | 0 | 1 | 0 | 1.00 | 1.22 | 0.78 | 1.26 | 6.4 | 25.6 s | 38.0 s | $0.42 per 1,000 |

MAE = mean absolute error against the labels, on a 1–10 scale (score MAE on the 10–100 display scale). Pass bar: ≤ 1.5 per parameter, every non-sunset caught.

## Per photo

| Photo | Label (P/R/S/W) | anthropic (P/R/S/W · phenomena) | gemma-fast (P/R/S/W · phenomena) | gemma (P/R/S/W · phenomena) |
|---|---|---|---|---|
| field-wheat | 4/7/6/1 | 4/10/5/1 · – | 4/10/6/1 · – | 4/10/5/1 · – |
| greenflash-morro | 4/5/4/6 | 4/4/3/2 · other_rare? | 4/4/7/2 · green_flash? | 4/4/5/2 · green_flash? |
| iridescent-tuntorp-2 | 6/3/1/6 | not a sunset | 6/2/1/1 · – | 6/2/1/1 · – |
| iridescent-tuntorp-7 | 6/3/1/6 | not a sunset | 6/1/1/1 · – | 6/1/1/1 · – |
| lake-contrail | 5/3/8/5 | 4/2/8/6 · reflection | 4/2/8/6 · reflection | 4/2/8/5 · reflection |
| lake-dechsendorf | 6/9/7/6 | 6/9/7/6 · reflection | 6/9/8/6 · reflection | 6/9/7/6 · reflection |
| lake-jokulsarlon | 8/4/9/5 | 6/2/9/6 · reflection | 6/2/10/6 · reflection | 6/2/9/6 · reflection |
| lake-lesina | 3/10/6/2 | 3/8/7/5 · reflection | 3/8/8/6 · reflection | 3/8/9/5 · reflection |
| mountains-foggy | 3/6/8/1 | 3/6/9/2 · sun_rays? | 3/6/9/1 · – | 3/6/9/1 · – |
| mountains-himalayas | 5/2/9/5 | 7/2/10/6 · sun_rays | 7/2/10/6 · sun_rays | 7/2/9/6 · sun_rays |
| ocean-after-sunset | 3/1/9/1 | 5/1/9/1 · – | 5/1/9/1 · – | 5/1/9/1 · – |
| ocean-kuta | 3/6/5/2 | 3/4/5/2 · reflection? | 3/4/7/5 · reflection | 3/4/6/1 · – |
| ocean-noronha | 5/8/8/1 | 5/4/8/1 · – | 5/4/8/1 · – | 5/4/9/1 · – |
| ocean-rapanui | 4/2/6/2 | 3/2/8/3 · reflection?, sun_rays? | 3/2/8/1 · – | 3/2/7/1 · – |
| paddy-orange-pink | 8/6/6/5 | 7/4/5/5 · reflection | 7/4/7/6 · reflection | 7/4/7/6 · reflection |
| paddy-stringy | 8/8/5/3 | 8/8/5/2 · sun_rays? | 8/8/5/1 · – | 8/8/5/1 · – |
| rays-pacific | 3/3/4/6 | 6/3/8/6 · sun_rays | 6/3/7/6 · sun_rays | 6/3/6/6 · sun_rays |
| rays-telstra | 4/2/7/6 | 8/1/7/6 · sun_rays | 8/1/8/6 · sun_rays | 8/1/8/6 · sun_rays |
| rays-waterberg | 7/3/5/6 | 5/4/5/6 · sun_rays | 5/4/5/6 · sun_rays | 5/4/4/6 · sun_rays |
| skyline-manhattan | 5/7/9/2 | 7/2/9/2 · reflection? | 7/2/9/1 · – | 7/2/10/1 · – |
| skyline-rio | 2/2/10/5 | 3/1/10/6 · sun_rays | 3/1/10/6 · sun_rays | 3/1/10/6 · sun_rays |
| sundog-brofjorden | 5/2/7/8 | 4/3/6/2 · halo? | 4/3/7/6 · reflection | 4/3/7/5 · reflection |
| sundog-right | 4/4/2/3 | 5/3/4/1 · – | 5/3/3/1 · – | 5/3/5/1 · – |
| tree-single | 4/2/9/2 | 4/1/8/5 · reflection | 4/1/7/1 · – | 4/1/8/5 · reflection, sun_rays? |
| trees-crane | 4/8/5/1 | 5/9/6/1 · – | 5/9/6/1 · – | 5/9/6/1 · – |
| trees-cypress | 5/3/9/1 | 7/3/7/1 · – | 7/3/9/1 · – | 7/3/9/1 · – |
| trees-silhouettes | 4/5/8/1 | 5/6/5/1 · – | 5/6/7/1 · – | 5/6/7/1 · – |
| karst-reflection | not a sunset | not a sunset | 7/1/9/6 · reflection | 7/1/9/6 · reflection |
| not-diary | not a sunset | not a sunset | not a sunset | not a sunset |
| not-price-building | not a sunset | 8/3/8/1 · – | not a sunset | not a sunset |
| not-rockies-book | not a sunset | not a sunset | not a sunset | not a sunset |
