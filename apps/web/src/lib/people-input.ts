// Names on sunsets: the rules with no database code, safe to use in the browser (Phase 4f-2).

export const MAX_NAME_LENGTH = 40;
export const MAX_NAMES_PER_ENTRY = 12;

/** A name as typed, tidied: spaces collapsed, trimmed, cut to length. Null when empty. */
export function parseName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH).trim();
  return name || null;
}

/** Tidied names, each once (ignoring case, first spelling wins), at most MAX_NAMES_PER_ENTRY. */
export function parseNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const names: string[] = [];
  for (const item of raw) {
    const name = parseName(item);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    names.push(name);
    if (names.length === MAX_NAMES_PER_ENTRY) break;
  }
  return names;
}

/** "Steve", "Steve and Maria", "Steve, Maria and the grandkids" (a name list in a sentence). */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/**
 * The Journal filter (Build Spec 1.3): "With people" is the people check saying yes, or names on
 * the entry; "Pure sunset" is neither.
 */
export function hasPeopleIn(entry: { hasPeople: boolean | null }, names: string[] | undefined): boolean {
  return entry.hasPeople === true || (names?.length ?? 0) > 0;
}
