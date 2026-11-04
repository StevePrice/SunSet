import { describe, expect, it } from "vitest";
import { spearman } from "./calibration";

describe("spearman", () => {
  it("is 1 for the same order, -1 for the reverse, and handles ties", () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1);
    expect(spearman([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1);
    expect(spearman([1, 1, 2, 3], [5, 5, 6, 7])).toBeCloseTo(1);
    expect(spearman([1, 2], [1, 2])).toBeNull();
  });
});
