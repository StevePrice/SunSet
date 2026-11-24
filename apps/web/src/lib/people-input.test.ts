import { describe, expect, it } from "vitest";
import { hasPeopleIn, joinNames, MAX_NAME_LENGTH, MAX_NAMES_PER_ENTRY, parseName, parseNames } from "./people-input";

describe("parseName", () => {
  it("tidies spaces and refuses empty names", () => {
    expect(parseName("  The   grandkids ")).toBe("The grandkids");
    expect(parseName("   ")).toBeNull();
    expect(parseName(7)).toBeNull();
    expect(parseName("x".repeat(100))).toHaveLength(MAX_NAME_LENGTH);
  });
});

describe("parseNames", () => {
  it("keeps each name once, ignoring case, first spelling wins", () => {
    expect(parseNames(["Steve", "steve", " Maria ", "", null, "STEVE"])).toEqual(["Steve", "Maria"]);
    expect(parseNames("Steve")).toEqual([]);
  });

  it("caps how many names one sunset can have", () => {
    expect(parseNames(Array.from({ length: 30 }, (_, i) => `Name ${i}`))).toHaveLength(MAX_NAMES_PER_ENTRY);
  });
});

describe("joinNames", () => {
  it("reads as a sentence", () => {
    expect(joinNames([])).toBe("");
    expect(joinNames(["Steve"])).toBe("Steve");
    expect(joinNames(["Steve", "Maria"])).toBe("Steve and Maria");
    expect(joinNames(["Steve", "Maria", "the grandkids"])).toBe("Steve, Maria and the grandkids");
  });
});

describe("hasPeopleIn (the Journal filter)", () => {
  it("is With people when the check says yes or there are names", () => {
    expect(hasPeopleIn({ hasPeople: true }, [])).toBe(true);
    expect(hasPeopleIn({ hasPeople: false }, ["Steve"])).toBe(true);
    expect(hasPeopleIn({ hasPeople: null }, undefined)).toBe(false);
    expect(hasPeopleIn({ hasPeople: false }, [])).toBe(false);
  });
});
