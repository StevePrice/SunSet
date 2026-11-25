import { describe, expect, it } from "vitest";
import { groupByMonth, journalHref, parseJournalShow, parseJournalView } from "./journal-view";

describe("parseJournalView", () => {
  it("defaults to Stories and only accepts photos as the other view", () => {
    expect(parseJournalView(undefined)).toBe("stories");
    expect(parseJournalView("photos")).toBe("photos");
    expect(parseJournalView("stories")).toBe("stories");
    expect(parseJournalView("grid")).toBe("stories");
    expect(parseJournalView(["photos", "stories"])).toBe("stories");
  });

  it("opens the last view used when the URL doesn't name one", () => {
    expect(parseJournalView(undefined, "photos")).toBe("photos");
    expect(parseJournalView(undefined, "stories")).toBe("stories");
    expect(parseJournalView(undefined, "nonsense")).toBe("stories");
    // The URL wins over the remembered view.
    expect(parseJournalView("stories", "photos")).toBe("stories");
  });

  it("round-trips through the URL", () => {
    expect(journalHref("photos", "all")).toBe("/journal?view=photos&show=all");
    const params = new URL(journalHref("stories", "people"), "https://x").searchParams;
    expect(parseJournalView(params.get("view") ?? undefined)).toBe("stories");
    expect(parseJournalShow(params.get("show") ?? undefined)).toBe("people");
  });
});

describe("parseJournalShow", () => {
  it("defaults to All, opens the last filter used, and the URL wins", () => {
    expect(parseJournalShow(undefined)).toBe("all");
    expect(parseJournalShow("pure")).toBe("pure");
    expect(parseJournalShow("nonsense")).toBe("all");
    expect(parseJournalShow(undefined, "people")).toBe("people");
    expect(parseJournalShow("all", "people")).toBe("all");
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

  it("groups each entry by its own time zone when it has one", () => {
    // 05:30 UTC on 1 November is still 31 October in Los Angeles.
    const items = [{ takenAt: "2026-11-01T05:30:00Z", timeZone: "America/Los_Angeles" }, { takenAt: "2026-11-01T05:30:00Z", timeZone: null }];
    const groups = groupByMonth(items, "UTC");
    expect(groups.map((g) => g.label)).toEqual(["October 2026", "November 2026"]);
  });
});
