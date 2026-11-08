import { describe, expect, it } from "vitest";
import { groupByMonth, journalViewHref, parseJournalView } from "./journal-view";

describe("parseJournalView", () => {
  it("defaults to Stories and only accepts photos as the other view", () => {
    expect(parseJournalView(undefined)).toBe("stories");
    expect(parseJournalView("photos")).toBe("photos");
    expect(parseJournalView("stories")).toBe("stories");
    expect(parseJournalView("grid")).toBe("stories");
    expect(parseJournalView(["photos", "stories"])).toBe("stories");
  });

  it("round-trips through the URL", () => {
    expect(journalViewHref("photos")).toBe("/journal?view=photos");
    expect(journalViewHref("stories")).toBe("/journal");
    expect(parseJournalView(new URL(journalViewHref("photos"), "https://x").searchParams.get("view") ?? undefined)).toBe("photos");
  });
});

describe("groupByMonth", () => {
  const items = [
    { id: "a", takenAt: "2026-11-05T18:00:00.000Z" },
    { id: "b", takenAt: "2026-11-01T02:30:00.000Z" },
    { id: "c", takenAt: "2026-10-20T17:00:00.000Z" },
    { id: "d", takenAt: "2025-11-30T17:00:00.000Z" },
  ];

  it("groups newest first under month headings", () => {
    const groups = groupByMonth(items, "UTC");
    expect(groups.map((g) => [g.label, g.items.map((i) => i.id)])).toEqual([
      ["November 2026", ["a", "b"]],
      ["October 2026", ["c"]],
      ["November 2025", ["d"]],
    ]);
  });

  it("uses the viewer's time zone, so a photo near midnight goes in the month its date shows", () => {
    // 02:30 UTC on 1 November is still 31 October evening in Los Angeles.
    const groups = groupByMonth(items, "America/Los_Angeles");
    expect(groups.map((g) => [g.key, g.items.map((i) => i.id)])).toEqual([
      ["2026-11", ["a"]],
      ["2026-10", ["b", "c"]],
      ["2025-11", ["d"]],
    ]);
    // And 23:30 UTC on 31 October is already 1 November in Auckland.
    expect(groupByMonth([{ takenAt: "2026-10-31T23:30:00.000Z" }], "Pacific/Auckland")[0].label).toBe("November 2026");
  });

  it("returns no groups for no items", () => {
    expect(groupByMonth([], "UTC")).toEqual([]);
  });
});
