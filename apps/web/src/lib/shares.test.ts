import { describe, expect, it } from "vitest";
import { cardContent, cardVersion } from "./share-card";
import { newShareId, parsePlace, parseTimeZone, type PublicShare } from "./shares";

describe("newShareId", () => {
  it("makes 22-character base62 ids that don't repeat", () => {
    const ids = new Set(Array.from({ length: 1000 }, newShareId));
    expect(ids.size).toBe(1000);
    for (const id of ids) expect(id).toMatch(/^[0-9A-Za-z]{22}$/);
  });
});

describe("parseTimeZone", () => {
  it("keeps real time zones and falls back to UTC", () => {
    expect(parseTimeZone("America/Los_Angeles")).toBe("America/Los_Angeles");
    expect(parseTimeZone("Not/AZone")).toBe("UTC");
    expect(parseTimeZone(42)).toBe("UTC");
  });
});

describe("parsePlace", () => {
  it("trims, collapses spaces, and treats blank as no place", () => {
    expect(parsePlace("  Ocean   Beach ")).toEqual({ ok: true, value: "Ocean Beach" });
    expect(parsePlace("   ")).toEqual({ ok: true, value: null });
    expect(parsePlace(null)).toEqual({ ok: true, value: null });
    expect(parsePlace("x".repeat(81)).ok).toBe(false);
  });
});

describe("share card content", () => {
  const share: PublicShare = {
    id: "s",
    entryId: "e",
    ownerId: "u",
    ownerName: "Steve",
    story: "A long story. ".repeat(20),
    takenAt: new Date("2026-11-03T02:30:00Z"),
    photoWidth: 2560,
    photoHeight: 1440,
    place: null,
    timeZone: "America/Los_Angeles",
    score: null,
  };

  it("dates the card in the owner's time zone and shortens long stories", () => {
    const content = cardContent(share);
    expect(content.byline).toBe("Steve · November 2, 2026");
    expect(content.story!.length).toBeLessThanOrEqual(140);
    expect(content.story!.endsWith("…")).toBe(true);
    expect(content.score).toBeNull();
  });

  it("adds the place only when one is set", () => {
    expect(cardContent({ ...share, place: "Ocean Beach" }).byline).toBe("Steve · November 2, 2026 · Ocean Beach");
    expect(cardContent({ ...share, ownerName: null }).byline).toBe("November 2, 2026");
  });

  it("changes version when anything on the card changes", async () => {
    const a = await cardVersion(cardContent(share));
    expect(await cardVersion(cardContent(share))).toBe(a);
    expect(await cardVersion(cardContent({ ...share, place: "Ocean Beach" }))).not.toBe(a);
  });
});
