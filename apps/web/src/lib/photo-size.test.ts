import { describe, expect, it } from "vitest";
import { fitWithin, SHARE_PHOTO_EDGE } from "./photo-size";

describe("fitWithin", () => {
  it("scales the longer edge down to the limit, keeping the aspect ratio", () => {
    expect(fitWithin(4032, 3024, 2560)).toEqual({ width: 2560, height: 1920 });
    expect(fitWithin(3024, 4032, 480)).toEqual({ width: 360, height: 480 });
  });

  it("never scales up", () => {
    expect(fitWithin(800, 600, 2560)).toEqual({ width: 800, height: 600 });
  });
});

describe("SHARE_PHOTO_EDGE", () => {
  it("is within the Share Page's 1600–2000px range and smaller than the display photo", () => {
    expect(SHARE_PHOTO_EDGE).toBeGreaterThanOrEqual(1600);
    expect(SHARE_PHOTO_EDGE).toBeLessThanOrEqual(2000);
    expect(fitWithin(2560, 1920, SHARE_PHOTO_EDGE)).toEqual({ width: 1800, height: 1350 });
  });
});
