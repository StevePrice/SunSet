// Voice answers (Phase 5 step 3): rules shared by the browser recorder and the upload route.

/** Longest single recording; the recorder stops itself here. Story Capture PRD 6.4: ~2 minutes. */
export const MAX_RECORDING_SECONDS = 120;

/** Largest clip the server accepts. Two minutes of AAC or Opus is 1–2 MB; this leaves headroom. */
export const MAX_CLIP_BYTES = 10 * 1024 * 1024;

/** What MediaRecorder should produce, best first: Safari/iPhone record MP4 (AAC), others WebM (Opus). */
export const RECORDER_MIME_TYPES = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"] as const;

/** Content types the server stores, with the file extension each is saved under. */
const CLIP_TYPES: Record<string, string> = {
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
};

/** The first type this browser can record, or null (no recording; the user types instead). */
export function pickRecorderMime(isTypeSupported: (type: string) => boolean): string | null {
  for (const type of RECORDER_MIME_TYPES) {
    try {
      if (isTypeSupported(type)) return type;
    } catch {
      // Some browsers throw for types they don't know.
    }
  }
  return null;
}

/** "audio/webm;codecs=opus" → "audio/webm". */
export function baseContentType(type: string): string {
  return type.split(";")[0].trim().toLowerCase();
}

export type ClipCheck =
  | { ok: true; contentType: string; extension: string; durationMs: number }
  | { ok: false; error: string };

/** Checks an uploaded clip before it is stored. */
export function checkClip(clip: { size: number; type: string; durationMs: unknown }): ClipCheck {
  const contentType = baseContentType(clip.type);
  const extension = CLIP_TYPES[contentType];
  if (!extension) return { ok: false, error: "That recording format isn't supported." };
  if (clip.size <= 0) return { ok: false, error: "The recording is empty." };
  if (clip.size > MAX_CLIP_BYTES) return { ok: false, error: "That recording is too long." };
  const duration = Number(clip.durationMs);
  // The browser's timer can run a little past the limit before the recorder stops.
  const durationMs = Number.isFinite(duration) ? Math.round(Math.min(Math.max(duration, 0), (MAX_RECORDING_SECONDS + 5) * 1000)) : 0;
  return { ok: true, contentType, extension, durationMs };
}

/** 75_000 → "1:15". */
export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * Parses a single-range "Range: bytes=…" header against an object's size, for audio playback
 * (Safari won't play audio without it). Null means serve the whole object; "invalid" means 416.
 */
export function parseRange(header: string | null, size: number): { offset: number; length: number } | null | "invalid" {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === "" && match[2] === "")) return null;
  let start: number;
  let end: number;
  if (match[1] === "") {
    // Suffix range: the last N bytes.
    const suffix = Number(match[2]);
    if (suffix === 0) return "invalid";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
  }
  if (start >= size || end < start) return "invalid";
  return { offset: start, length: end - start + 1 };
}
