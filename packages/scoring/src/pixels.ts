// Palette and Reach, measured from pixels. Pure functions over RGBA data so they run anywhere
// (the scoring Worker, tests, the calibration script).

export type Rgba = { data: Uint8Array | Uint8ClampedArray; width: number; height: number };

export const ANALYSIS_EDGE = 960;

// Thresholds are v1 starting values, tuned on the calibration set.
const COLOURED = { minSaturation: 0.2, minValue: 0.15 };
const SUNSET = { minSaturation: 0.25, minValue: 0.2 };
const HUE_BINS = 12; // 30° each
const MIN_BIN_SHARE = 0.03;

export type PixelMetrics = {
  /** Share of the frame that is coloured at all (not grey, white or dark). */
  colouredFraction: number;
  /** Share of the frame in sunset colours: red, orange, yellow, pink, magenta, purple. */
  sunsetFraction: number;
  /** 30° hue bins holding at least 3% of the coloured pixels. */
  hueBinsUsed: number;
  /** Mean saturation of the coloured pixels, 0–1. */
  vividness: number;
};

export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  if (delta > 0) {
    if (max === rn) h = 60 * (((gn - bn) / delta + 6) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    else h = 60 * ((rn - gn) / delta + 4);
  }
  return { h, s: max === 0 ? 0 : delta / max, v: max };
}

export function isSunsetHue(h: number): boolean {
  return h >= 260 || h <= 60;
}

// Box-filter downscale so the longer edge is at most maxEdge. Averaging keeps colour
// statistics faithful to the full photo.
export function downscale(image: Rgba, maxEdge = ANALYSIS_EDGE): Rgba {
  const scale = Math.max(image.width, image.height) / maxEdge;
  if (scale <= 1) return image;
  const width = Math.max(1, Math.round(image.width / scale));
  const height = Math.max(1, Math.round(image.height / scale));
  const out = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const y0 = Math.floor((y * image.height) / height);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * image.height) / height));
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor((x * image.width) / width);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * image.width) / width));
      let r = 0, g = 0, b = 0, n = 0;
      for (let sy = y0; sy < y1; sy++) {
        let i = (sy * image.width + x0) * 4;
        for (let sx = x0; sx < x1; sx++, i += 4) {
          r += image.data[i];
          g += image.data[i + 1];
          b += image.data[i + 2];
          n++;
        }
      }
      const o = (y * width + x) * 4;
      out[o] = r / n;
      out[o + 1] = g / n;
      out[o + 2] = b / n;
      out[o + 3] = 255;
    }
  }
  return { data: out, width, height };
}

export function measurePixels(image: Rgba): PixelMetrics {
  const total = image.width * image.height;
  const bins = new Array<number>(HUE_BINS).fill(0);
  let coloured = 0;
  let sunset = 0;
  let saturationSum = 0;
  for (let i = 0; i < total * 4; i += 4) {
    const { h, s, v } = rgbToHsv(image.data[i], image.data[i + 1], image.data[i + 2]);
    if (s >= COLOURED.minSaturation && v >= COLOURED.minValue) {
      coloured++;
      saturationSum += s;
      bins[Math.min(HUE_BINS - 1, Math.floor(h / (360 / HUE_BINS)))]++;
    }
    if (s >= SUNSET.minSaturation && v >= SUNSET.minValue && isSunsetHue(h)) sunset++;
  }
  return {
    colouredFraction: coloured / total,
    sunsetFraction: sunset / total,
    hueBinsUsed: coloured === 0 ? 0 : bins.filter((count) => count / coloured >= MIN_BIN_SHARE).length,
    vividness: coloured === 0 ? 0 : saturationSum / coloured,
  };
}
