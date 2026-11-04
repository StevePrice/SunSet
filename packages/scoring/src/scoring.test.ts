import { describe, expect, it } from "vitest";
import { downscale, measurePixels, rgbToHsv, type Rgba } from "./pixels";
import { parseScene, type SceneReport } from "./scene";
import { combineScores, paletteScore, reachScore, scoreEntry } from "./scores";

// Builds an image whose rows are filled by colour(y) — enough to model skies.
function image(width: number, height: number, colour: (x: number, y: number) => [number, number, number]): Rgba {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const [r, g, b] = colour(x, y);
      data.set([r, g, b, 255], (y * width + x) * 4);
    }
  return { data, width, height };
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))));
  };
  return [f(5), f(3), f(1)];
}

describe("pixel metrics", () => {
  it("converts RGB to HSV", () => {
    expect(rgbToHsv(255, 0, 0)).toEqual({ h: 0, s: 1, v: 1 });
    expect(rgbToHsv(255, 128, 0).h).toBeCloseTo(30, 0);
    expect(rgbToHsv(128, 128, 128).s).toBe(0);
  });

  it("scores a flat grey photo as the bottom of Palette and Reach", () => {
    const m = measurePixels(image(100, 60, () => [120, 120, 125]));
    expect(paletteScore(m)).toBe(1);
    expect(reachScore(m)).toBe(1);
  });

  it("scores a frame full of vivid sunset colours near the top", () => {
    // Purple at the top through pink, red and orange to yellow at the horizon.
    const m = measurePixels(image(200, 120, (_x, y) => hsvToRgb((300 + (y / 120) * 120) % 360, 0.85, 0.9)));
    expect(m.sunsetFraction).toBeGreaterThan(0.9);
    expect(reachScore(m)).toBe(10);
    expect(paletteScore(m)).toBeGreaterThanOrEqual(9);
  });

  it("measures Reach as the share of the frame in sunset colour", () => {
    // Top 30% orange glow, the rest blue-grey dusk sky.
    const m = measurePixels(image(100, 100, (_x, y) => (y < 30 ? hsvToRgb(25, 0.8, 0.9) : [70, 80, 100])));
    expect(m.sunsetFraction).toBeCloseTo(0.3, 2);
    expect(reachScore(m)).toBe(3);
  });

  it("downscales by averaging without changing colour statistics", () => {
    const big = image(1920, 1080, (_x, y) => (y < 540 ? hsvToRgb(20, 0.8, 0.9) : [40, 40, 40]));
    const small = downscale(big, 960);
    expect([small.width, small.height]).toEqual([960, 540]);
    expect(measurePixels(small).sunsetFraction).toBeCloseTo(measurePixels(big).sunsetFraction, 2);
  });
});

describe("anchor mappings", () => {
  const metrics = (sunsetFraction: number) => ({ colouredFraction: 1, sunsetFraction, hueBinsUsed: 3, vividness: 0.5 });

  it("maps Reach through its anchors", () => {
    expect(reachScore(metrics(0.03))).toBe(1);
    expect(reachScore(metrics(0.5))).toBe(5);
    expect(reachScore(metrics(0.95))).toBe(10);
  });

  it("maps Palette through its anchors", () => {
    expect(paletteScore({ colouredFraction: 0.5, sunsetFraction: 0.5, hueBinsUsed: 1, vividness: 0.25 })).toBe(1);
    expect(paletteScore({ colouredFraction: 0.5, sunsetFraction: 0.5, hueBinsUsed: 2, vividness: 0.5 })).toBeGreaterThanOrEqual(4);
    expect(paletteScore({ colouredFraction: 0.5, sunsetFraction: 0.5, hueBinsUsed: 2, vividness: 0.5 })).toBeLessThanOrEqual(5);
    expect(paletteScore({ colouredFraction: 0.9, sunsetFraction: 0.9, hueBinsUsed: 6, vividness: 0.8 })).toBe(10);
  });
});

describe("Wow Factor", () => {
  it("takes the vision model's reaction score, clamped to 1–10", () => {
    const metrics = { colouredFraction: 0.5, sunsetFraction: 0.5, hueBinsUsed: 3, vividness: 0.5 };
    const scene = (score: number): SceneReport => ({
      is_sunset: true,
      content_flag: "none",
      setting: { type: "trees", score: 6, reason: "" },
      phenomena: [],
      wow: { drivers: ["unique", "drama_contrast"], score, reason: "Living trees among burned ones." },
    });
    expect(scoreEntry(metrics, scene(8)).wow).toBe(8);
    expect(scoreEntry(metrics, scene(14)).wow).toBe(10);
    expect(scoreEntry(metrics, scene(0)).wow).toBe(1);
  });
});

describe("composite", () => {
  it("averages the four and shows it out of 100", () => {
    expect(combineScores({ palette: 7, reach: 6, setting: 8, wow: 5 })).toMatchObject({ composite: 6.5, displayScore: 65 });
    expect(combineScores({ palette: 1, reach: 1, setting: 1, wow: 1 }).displayScore).toBe(10);
  });
});

describe("scene validation", () => {
  const valid: SceneReport = {
    is_sunset: true,
    content_flag: "none",
    setting: { type: "ocean", score: 7, reason: "The sea horizon frames it." },
    phenomena: [{ kind: "reflection", confidence: "clear", striking: false, description: "on wet sand" }],
    wow: { drivers: ["rare"], score: 6, reason: "The reflection doubles the colour." },
  };

  it("accepts a well-formed report and rejects a malformed one", () => {
    expect(parseScene(valid)).toEqual(valid);
    expect(parseScene({ ...valid, setting: { ...valid.setting, type: "desert" } })).toBeNull();
    expect(parseScene({ ...valid, wow: { ...valid.wow, drivers: ["colour"] } })).toBeNull();
    expect(parseScene("not json")).toBeNull();
  });
});
