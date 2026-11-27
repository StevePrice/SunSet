import { withDrizzle } from "@/lib/db";
import { listEntries } from "@/lib/entries";
import { entriesWithName, parseName } from "@/lib/people";

/** The owner's sunsets with this name (from the URL), newest first, and the spelling to show. */
export async function loadSunsetsWith(userId: string, rawName: string) {
  // Next may hand the segment over still encoded; a name with a "%" in it must not throw.
  const asked = parseName(safeDecode(rawName));
  if (!asked) return null;
  const { name, entries } = await withDrizzle(async (db) => {
    const [all, found] = await Promise.all([listEntries(db, userId), entriesWithName(db, userId, asked)]);
    return { name: found.name, entries: all.filter((e) => found.entryIds.has(e.id)) };
  });
  return entries.length ? { name, entries } : null;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
