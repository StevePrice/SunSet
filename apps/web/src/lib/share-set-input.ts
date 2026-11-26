// Shared sets (Phase 4f-5, Build Spec 2.3–2.5). Kept free of database code so the browser can use it.

/** Sunsets in one set: enough for years of sunsets with one person, small enough for one page. */
export const MAX_SET_SIZE = 100;

/** "Steve, Louise shared 11 sunsets with you" (the link preview and the top of the set page). */
export function setGreeting(personName: string, ownerName: string | null, count: number): string {
  const sunsets = count === 1 ? "1 sunset" : `${count} sunsets`;
  return `${personName}, ${ownerName ?? "someone"} shared ${sunsets} with you`;
}

/** "August 2025 to July 2026", or one month when they're all in the same month. */
export function setDateRange(dates: { takenAt: Date; timeZone: string | null }[]): string | null {
  if (!dates.length) return null;
  const sorted = [...dates].sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());
  const month = (d: { takenAt: Date; timeZone: string | null }) =>
    new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: d.timeZone ?? "UTC" }).format(d.takenAt);
  const first = month(sorted[0]);
  const last = month(sorted.at(-1)!);
  return first === last ? first : `${first} to ${last}`;
}

/** The entry ids a share request asked for: unique, in order, at most MAX_SET_SIZE. */
export function parseSetEntryIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const ids = [...new Set(value.filter((v): v is string => typeof v === "string" && v.length > 0 && v.length <= 64))];
  if (!ids.length || ids.length > MAX_SET_SIZE) return null;
  return ids;
}
