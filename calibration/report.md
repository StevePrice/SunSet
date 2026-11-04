# Scorer calibration report

Run 2026-11-04T02:57:09.936Z · 31 photos (27 sunsets) · labels are drafts until reviewed.

| Provider | Model | Sunset? correct | Missed | False | Failed | Palette MAE | Reach MAE | Setting MAE | Wow MAE | Score MAE (/100) | Mean latency | p90 | Cost / photo |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| anthropic | claude-haiku-5-5 | 90% | 3 | 0 | 0 | 1.08 | 1.21 | 0.92 | 3.00 | 8.9 | 3.7 s | 5.8 s | $0.91 per 1,000 |

MAE = mean absolute error against the labels, on a 1–10 scale (score MAE on the 10–100 display scale). Pass bar: ≤ 1.5 per parameter, every non-sunset caught.

## Per photo

| Photo | Label (P/R/S/W) | anthropic (P/R/S/W · phenomena) |
|---|---|---|
| field-wheat | 4/7/6/1 | 4/10/4/4 · – |
| greenflash-morro | 4/5/4/6 | 4/4/6/5 · other_rare? |
| iridescent-tuntorp-2 | 6/3/1/6 | not a sunset |
| iridescent-tuntorp-7 | 6/3/1/6 | not a sunset |
| lake-contrail | 5/3/8/5 | 4/2/7/6 · reflection |
| lake-dechsendorf | 6/9/7/6 | 6/9/6/6 · reflection |
| lake-jokulsarlon | 8/4/9/5 | 6/2/8/7 · reflection |
| lake-lesina | 3/10/6/2 | 3/8/7/7 · reflection? |
| mountains-foggy | 3/6/8/1 | 3/6/8/7 · – |
| mountains-himalayas | 5/2/9/5 | 7/2/9/8 · sun_rays? |
| ocean-after-sunset | 3/1/9/1 | 5/1/8/6 · – |
| ocean-kuta | 3/6/5/2 | 3/4/5/3 · – |
| ocean-noronha | 5/8/8/1 | 5/4/7/5 · – |
| ocean-rapanui | 4/2/6/2 | 3/2/7/6 · – |
| paddy-orange-pink | 8/6/6/5 | 7/4/5/6 · reflection |
| paddy-stringy | 8/8/5/3 | 8/8/5/6 · iridescent_clouds? |
| rays-pacific | 3/3/4/6 | 6/3/7/7 · sun_rays |
| rays-telstra | 4/2/7/6 | 8/1/7/8 · sun_rays |
| rays-waterberg | 7/3/5/6 | 5/4/5/8 · sun_rays |
| skyline-manhattan | 5/7/9/2 | 7/2/9/7 · – |
| skyline-rio | 2/2/10/5 | not a sunset |
| sundog-brofjorden | 5/2/7/8 | 4/3/6/5 · halo? |
| sundog-right | 4/4/2/3 | 5/3/4/4 · – |
| tree-single | 4/2/9/2 | 4/1/8/6 · reflection |
| trees-crane | 4/8/5/1 | 5/9/5/6 · – |
| trees-cypress | 5/3/9/1 | 7/3/8/6 · – |
| trees-silhouettes | 4/5/8/1 | 5/6/6/6 · – |
| karst-reflection | not a sunset | not a sunset |
| not-diary | not a sunset | not a sunset |
| not-price-building | not a sunset | not a sunset |
| not-rockies-book | not a sunset | not a sunset |
