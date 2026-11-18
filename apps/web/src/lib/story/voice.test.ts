import { describe, expect, it } from "vitest";
import { baseContentType, checkClip, formatDuration, MAX_CLIP_BYTES, parseRange, pickRecorderMime } from "./voice";

describe("pickRecorderMime", () => {
  it("prefers MP4 (Safari/iPhone), then WebM Opus, then plain WebM", () => {
    expect(pickRecorderMime(() => true)).toBe("audio/mp4");
    expect(pickRecorderMime((t) => t.startsWith("audio/webm"))).toBe("audio/webm;codecs=opus");
    expect(pickRecorderMime((t) => t === "audio/webm")).toBe("audio/webm");
  });

  it("returns null when nothing can be recorded, even if the check throws", () => {
    expect(pickRecorderMime(() => false)).toBeNull();
    expect(
      pickRecorderMime(() => {
        throw new Error("unknown type");
      }),
    ).toBeNull();
  });
});

describe("checkClip", () => {
  it("accepts allowed audio types and strips codec parameters", () => {
    expect(baseContentType("audio/webm;codecs=opus")).toBe("audio/webm");
    expect(checkClip({ size: 1000, type: "audio/mp4", durationMs: "4200" })).toEqual({
      ok: true,
      contentType: "audio/mp4",
      extension: "m4a",
      durationMs: 4200,
    });
    expect(checkClip({ size: 1000, type: "audio/webm;codecs=opus", durationMs: 1 })).toMatchObject({ ok: true, extension: "webm" });
  });

  it("rejects other types, empty and oversized clips", () => {
    expect(checkClip({ size: 1000, type: "video/mp4", durationMs: 1 }).ok).toBe(false);
    expect(checkClip({ size: 1000, type: "text/html", durationMs: 1 }).ok).toBe(false);
    expect(checkClip({ size: 1000, type: "", durationMs: 1 }).ok).toBe(false);
    expect(checkClip({ size: 0, type: "audio/mp4", durationMs: 1 }).ok).toBe(false);
    expect(checkClip({ size: MAX_CLIP_BYTES + 1, type: "audio/mp4", durationMs: 1 }).ok).toBe(false);
  });

  it("clamps a missing or silly duration", () => {
    expect(checkClip({ size: 10, type: "audio/mp4", durationMs: "abc" })).toMatchObject({ durationMs: 0 });
    expect(checkClip({ size: 10, type: "audio/mp4", durationMs: -5 })).toMatchObject({ durationMs: 0 });
    expect(checkClip({ size: 10, type: "audio/mp4", durationMs: 9_999_999 })).toMatchObject({ durationMs: 125_000 });
  });
});

describe("parseRange", () => {
  it("serves the whole object without a usable header", () => {
    expect(parseRange(null, 100)).toBeNull();
    expect(parseRange("bytes=-", 100)).toBeNull();
    expect(parseRange("items=0-1", 100)).toBeNull();
  });

  it("handles start-end, open-ended and suffix ranges", () => {
    expect(parseRange("bytes=0-1", 100)).toEqual({ offset: 0, length: 2 });
    expect(parseRange("bytes=10-", 100)).toEqual({ offset: 10, length: 90 });
    expect(parseRange("bytes=90-500", 100)).toEqual({ offset: 90, length: 10 });
    expect(parseRange("bytes=-20", 100)).toEqual({ offset: 80, length: 20 });
  });

  it("rejects ranges outside the object", () => {
    expect(parseRange("bytes=100-", 100)).toBe("invalid");
    expect(parseRange("bytes=5-2", 100)).toBe("invalid");
    expect(parseRange("bytes=-0", 100)).toBe("invalid");
  });
});

it("formats durations as m:ss", () => {
  expect(formatDuration(0)).toBe("0:00");
  expect(formatDuration(75_400)).toBe("1:15");
  expect(formatDuration(120_000)).toBe("2:00");
});
