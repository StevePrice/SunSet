import { describe, expect, it } from "vitest";
import type { Entry } from "./entries";
import { audioExtension, exportSunset, sunsetFileName } from "./export";

const entry: Entry = {
  id: "0f1e2d3c-aaaa-bbbb-cccc-000000000000",
  story: "Gold over the pier.",
  title: "Lone Trees: After the Fire!",
  caption: null,
  takenAt: new Date("2026-08-23T03:30:00Z"),
  location: { latitude: 33.15, longitude: -117.35 },
  placeName: "Carlsbad, California",
  timeZone: "America/Los_Angeles",
  hasPeople: true,
  photoWidth: 100,
  photoHeight: 100,
  createdAt: new Date("2026-08-23T04:00:00Z"),
};

describe("export file names", () => {
  it("names a sunset by its own date, a tidy title and the start of its id", () => {
    // 03:30 UTC on 23 August is still 22 August in Carlsbad.
    expect(sunsetFileName(entry)).toBe("2026-08-22 Lone Trees After the Fire 0f1e2d3c");
    expect(sunsetFileName({ ...entry, title: null, timeZone: null })).toBe("2026-08-23 Sunset 0f1e2d3c");
  });

  it("gives recordings a sensible extension", () => {
    expect(audioExtension("audio/webm;codecs=opus")).toBe("webm");
    expect(audioExtension("audio/mp4")).toBe("m4a");
    expect(audioExtension("application/octet-stream")).toBe("audio");
  });
});

describe("export record", () => {
  it("links the photo and recordings, spells out reactions, and leaves out a score that isn't done", () => {
    const { photo, recordings, record } = exportSunset({
      entry,
      score: null,
      afterglow: {
        counts: { wow: 1, wish: 0, love: 0, hugs: 1 },
        people: [{ visitorId: "v", name: "Maria", reactions: [{ id: "r1", kind: "wow" }, { id: "r2", kind: "hugs" }], note: { id: "n", body: "Beautiful" } }],
      },
      clips: [
        { id: "c1", r2Key: "k1", contentType: "audio/webm", durationMs: 42_400, transcript: "We walked out" },
        { id: "c2", r2Key: "k2", contentType: "audio/mp4", durationMs: 10_000, transcript: null },
      ],
      originalWords: "We walked out",
      people: ["Steve"],
    });
    expect(photo).toBe("photos/2026-08-22 Lone Trees After the Fire 0f1e2d3c.jpg");
    expect(recordings.map((r) => r.path)).toEqual([
      "recordings/2026-08-22 Lone Trees After the Fire 0f1e2d3c part 1.webm",
      "recordings/2026-08-22 Lone Trees After the Fire 0f1e2d3c part 2.m4a",
    ]);
    expect(record).toMatchObject({
      title: "Lone Trees: After the Fire!",
      place: "Carlsbad, California",
      people: ["Steve"],
      score: null,
      recordings: [{ seconds: 42, transcript: "We walked out" }, { seconds: 10, transcript: null }],
      fromFriends: [{ name: "Maria", reactions: ["Wow", "Sending hugs"], note: "Beautiful" }],
    });
  });
});
