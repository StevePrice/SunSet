import { describe, expect, it } from "vitest";
import { isJpeg, parseEntryForm, parseLocation, parseStory, parseTakenAt } from "./entry-input";

const form = (fields: Record<string, string>) => ({ get: (name: string) => fields[name] ?? null });

describe("entry input", () => {
  it("trims the story and treats blank as no story", () => {
    expect(parseStory("  A goodbye  ")).toEqual({ ok: true, value: "A goodbye" });
    expect(parseStory("   ")).toEqual({ ok: true, value: null });
    expect(parseStory("x".repeat(2001)).ok).toBe(false);
  });

  it("accepts a valid location or none, and rejects half or out-of-range ones", () => {
    expect(parseLocation("", "")).toEqual({ ok: true, value: null });
    expect(parseLocation("37.77", "-122.42")).toEqual({ ok: true, value: { latitude: 37.77, longitude: -122.42 } });
    expect(parseLocation("37.77", "").ok).toBe(false);
    expect(parseLocation("91", "0").ok).toBe(false);
  });

  it("ignores photo dates in the future or before 1900", () => {
    const now = new Date("2026-11-02T12:00:00Z");
    expect(parseTakenAt("2026-11-01T20:00:00Z", now)).toEqual(new Date("2026-11-01T20:00:00Z"));
    expect(parseTakenAt("2026-12-01T00:00:00Z", now)).toBeNull();
    expect(parseTakenAt("1850-01-01T00:00:00Z", now)).toBeNull();
    expect(parseTakenAt("not a date", now)).toBeNull();
  });

  it("requires photo dimensions", () => {
    expect(parseEntryForm(form({ story: "Hi" })).ok).toBe(false);
    expect(parseEntryForm(form({ photoWidth: "2560", photoHeight: "1920" }))).toMatchObject({ ok: true });
  });

  it("recognises JPEG files by their first bytes", async () => {
    expect(await isJpeg(new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])]))).toBe(true);
    expect(await isJpeg(new Blob(["<svg>"]))).toBe(false);
  });
});
