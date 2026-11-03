import { describe, expect, it } from "vitest";
import { fitWithin } from "./photo-size";

describe("fitWithin", () => {
  it("scales the longer edge down to the limit, keeping the aspect ratio", () => {
    expect(fitWithin(4032, 3024, 2560)).toEqual({ width: 2560, height: 1920 });
    expect(fitWithin(3024, 4032, 480)).toEqual({ width: 360, height: 480 });
  });

  it("never scales up", () => {
    expect(fitWithin(800, 600, 2560)).toEqual({ width: 800, height: 600 });
  });
});
