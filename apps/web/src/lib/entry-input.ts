// Validation for what a browser sends when saving or editing a Journal entry.

export const MAX_STORY_LENGTH = 2000;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_THUMB_BYTES = 1024 * 1024;
export const MAX_PHOTO_EDGE = 4096;

export type Location = { latitude: number; longitude: number };

export type EntryInput = {
  story: string | null;
  takenAt: Date | null;
  location: Location | null;
  photoWidth: number;
  photoHeight: number;
};

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseStory(raw: unknown): Parsed<string | null> {
  if (raw == null) return { ok: true, value: null };
  if (typeof raw !== "string") return { ok: false, error: "Story must be text." };
  const story = raw.trim();
  if (story.length > MAX_STORY_LENGTH) {
    return { ok: false, error: `Story must be at most ${MAX_STORY_LENGTH} characters.` };
  }
  return { ok: true, value: story || null };
}

export function parseLocation(rawLatitude: unknown, rawLongitude: unknown): Parsed<Location | null> {
  const blank = (v: unknown) => v == null || v === "";
  if (blank(rawLatitude) && blank(rawLongitude)) return { ok: true, value: null };
  if (blank(rawLatitude) || blank(rawLongitude)) {
    return { ok: false, error: "Location needs both a latitude and a longitude." };
  }
  const latitude = Number(rawLatitude);
  const longitude = Number(rawLongitude);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return { ok: false, error: "Location is not a valid latitude and longitude." };
  }
  return { ok: true, value: { latitude, longitude } };
}

// Photo dates from the future (beyond a day of clock or time-zone slack) or before photography
// are treated as unknown.
export function parseTakenAt(raw: unknown, now = new Date()): Date | null {
  if (typeof raw !== "string" || raw === "") return null;
  const date = new Date(raw);
  const time = date.getTime();
  if (Number.isNaN(time)) return null;
  if (time > now.getTime() + 24 * 60 * 60 * 1000 || date.getUTCFullYear() < 1900) return null;
  return date;
}

function parseDimension(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 && n <= MAX_PHOTO_EDGE ? n : null;
}

export function parseEntryForm(form: {
  get(name: string): unknown;
}): Parsed<EntryInput> {
  const story = parseStory(form.get("story"));
  if (!story.ok) return story;
  const location = parseLocation(form.get("latitude"), form.get("longitude"));
  if (!location.ok) return location;
  const photoWidth = parseDimension(form.get("photoWidth"));
  const photoHeight = parseDimension(form.get("photoHeight"));
  if (!photoWidth || !photoHeight) return { ok: false, error: "Photo dimensions are missing." };
  return {
    ok: true,
    value: {
      story: story.value,
      takenAt: parseTakenAt(form.get("takenAt")),
      location: location.value,
      photoWidth,
      photoHeight,
    },
  };
}

// The browser re-encodes every photo as JPEG before upload; anything else is rejected.
export async function isJpeg(file: Blob): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 3).arrayBuffer());
  return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
}
