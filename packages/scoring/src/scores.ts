// Turns measurements into 1–10 scores using the anchors in the concept doc, and combines them.
import type { PixelMetrics } from "./pixels";
import type { SceneReport } from "./scene";

export const clampScore = (n: number) => Math.min(10, Math.max(1, Math.round(n)));
const unit = (n: number) => Math.min(1, Math.max(0, n));

// 1: one muted colour · 5: a couple of clear, moderately vivid colours · 10: many vivid colours.
export function paletteScore(m: PixelMetrics): number {
  if (m.colouredFraction < 0.01) return 1;
  const variety = unit((m.hueBinsUsed - 1) / 4);
  const vivid = unit((m.vividness - 0.2) / 0.55);
  return clampScore(1 + 9 * (0.55 * variety + 0.45 * vivid));
}

// ≤5% of the frame → 1 · 50% → 5 · ≥90% → 10, linear in between.
export function reachScore(m: PixelMetrics): number {
  const f = m.sunsetFraction;
  if (f <= 0.05) return 1;
  if (f <= 0.5) return clampScore(1 + (4 * (f - 0.05)) / 0.45);
  if (f < 0.9) return clampScore(5 + (5 * (f - 0.5)) / 0.4);
  return 10;
}

export type Scores = {
  palette: number;
  reach: number;
  setting: number;
  wow: number;
  composite: number;
  displayScore: number;
};

export function combineScores(parts: Omit<Scores, "composite" | "displayScore">): Scores {
  const composite = Math.round(((parts.palette + parts.reach + parts.setting + parts.wow) / 4) * 100) / 100;
  return { ...parts, composite, displayScore: Math.round(composite * 10) };
}

export function scoreEntry(metrics: PixelMetrics, scene: SceneReport): Scores {
  return combineScores({
    palette: paletteScore(metrics),
    reach: reachScore(metrics),
    setting: clampScore(scene.setting.score),
    // Wow is the vision model's judgement of the reaction the photo creates (concept doc, v2).
    wow: clampScore(scene.wow.score),
  });
}
