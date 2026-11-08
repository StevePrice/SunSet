import { describe, expect, it } from "vitest";
import { parsePointEwkb } from "./point";

describe("parsePointEwkb", () => {
  it("reads an EWKB point with an SRID", () => {
    // SELECT 'SRID=4326;POINT(-122.42 37.77)'::geometry
    expect(parsePointEwkb("0101000020e61000007b14ae47e19a5ec0c3f5285c8fe24240")).toEqual({
      x: -122.42,
      y: 37.77,
    });
  });

  it("reads a plain WKB point", () => {
    expect(parsePointEwkb("0101000000000000000000F03F0000000000000040")).toEqual({ x: 1, y: 2 });
  });
});
