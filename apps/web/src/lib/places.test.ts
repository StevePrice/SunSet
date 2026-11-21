import { describe, expect, it } from "vitest";
import { placeLabel } from "./places";

describe("placeLabel", () => {
  it("names the state in the US, Canada, Australia and the UK, the country elsewhere", () => {
    expect(placeLabel({ name: "Carlsbad", region: "California", countryCode: "US", country: "United States" })).toBe("Carlsbad, California");
    expect(placeLabel({ name: "Bath", region: "England", countryCode: "GB", country: "United Kingdom" })).toBe("Bath, England");
    expect(placeLabel({ name: "Arles", region: "Provence-Alpes-Côte d'Azur", countryCode: "FR", country: "France" })).toBe("Arles, France");
  });

  it("falls back sensibly and never repeats the name", () => {
    expect(placeLabel({ name: "Monaco", region: null, countryCode: "MC", country: "Monaco" })).toBe("Monaco");
    expect(placeLabel({ name: "Hilo", region: null, countryCode: "US", country: "United States" })).toBe("Hilo, United States");
    expect(placeLabel({ name: "Nowhere", region: null, countryCode: "XX", country: null })).toBe("Nowhere");
  });
});
