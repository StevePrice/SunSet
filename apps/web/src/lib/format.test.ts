import { describe, expect, it } from "vitest";
import { formatLocation } from "./format";

describe("formatLocation", () => {
  it("shows hemispheres instead of signs", () => {
    expect(formatLocation({ latitude: 37.7749, longitude: -122.4194 })).toBe("37.775° N, 122.419° W");
    expect(formatLocation({ latitude: -33.8568, longitude: 151.2153 })).toBe("33.857° S, 151.215° E");
  });
});
