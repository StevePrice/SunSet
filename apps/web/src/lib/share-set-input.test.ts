import { describe, expect, it } from "vitest";
import { MAX_SET_SIZE, parseSetEntryIds, setDateRange, setGreeting } from "./share-set-input";

describe("shared set helpers (4f-5)", () => {
  it("greets the person the set is for", () => {
    expect(setGreeting("Steve", "Louise", 11)).toBe("Steve, Louise shared 11 sunsets with you");
    expect(setGreeting("Steve", null, 1)).toBe("Steve, someone shared 1 sunset with you");
  });

  it("shows the months the sunsets span, in each sunset's own time zone", () => {
    const la = "America/Los_Angeles";
    expect(setDateRange([])).toBeNull();
    // 3am UTC on August 1 is still July 31 in California.
    expect(setDateRange([{ takenAt: new Date("2025-08-01T03:00:00Z"), timeZone: la }])).toBe("July 2025");
    expect(
      setDateRange([
        { takenAt: new Date("2026-07-25T03:00:00Z"), timeZone: la },
        { takenAt: new Date("2025-08-16T20:00:00Z"), timeZone: la },
      ]),
    ).toBe("August 2025 to July 2026");
  });

  it("accepts a list of ids, without repeats, up to the limit", () => {
    expect(parseSetEntryIds(["a", "b", "a", 3, ""])).toEqual(["a", "b"]);
    expect(parseSetEntryIds([])).toBeNull();
    expect(parseSetEntryIds("a")).toBeNull();
    expect(parseSetEntryIds(Array.from({ length: MAX_SET_SIZE + 1 }, (_, i) => `id${i}`))).toBeNull();
  });
});
