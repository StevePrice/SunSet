// Names on sunsets (Phase 4f-2, Sunsets Together, Build Spec 2.1–2.2). The scorer says whether
// people are in a photo; the owner says who. Names are owner-only.
import { and, count, desc, eq, inArray, max, sql } from "drizzle-orm";
import { entryPeople, entries } from "@/db/schema";
import type { Db } from "@/lib/db";

export { hasPeopleIn, joinNames, MAX_NAME_LENGTH, MAX_NAMES_PER_ENTRY, parseName, parseNames } from "@/lib/people-input";
import { parseNames } from "@/lib/people-input";

/** The names on one entry, in the order they were added. */
export async function namesForEntry(db: Db, userId: string, entryId: string): Promise<string[]> {
  const rows = await db
    .select({ name: entryPeople.name })
    .from(entryPeople)
    .where(and(eq(entryPeople.userId, userId), eq(entryPeople.entryId, entryId)))
    .orderBy(entryPeople.createdAt, entryPeople.name);
  return rows.map((r) => r.name);
}

/** Every entry's names, for the Journal's cards and filter. */
export async function namesByEntry(db: Db, userId: string): Promise<Map<string, string[]>> {
  const rows = await db
    .select({ entryId: entryPeople.entryId, name: entryPeople.name })
    .from(entryPeople)
    .where(eq(entryPeople.userId, userId))
    .orderBy(entryPeople.createdAt, entryPeople.name);
  const map = new Map<string, string[]>();
  for (const { entryId, name } of rows) map.set(entryId, [...(map.get(entryId) ?? []), name]);
  return map;
}

/**
 * Names this person has used, most recently used first, with how many sunsets each is on. The
 * spelling shown is the most recent one, so a corrected spelling takes over.
 */
export async function nameChips(db: Db, userId: string): Promise<{ name: string; count: number }[]> {
  const key = sql<string>`lower(${entryPeople.name})`;
  const rows = await db
    .select({
      key,
      name: sql<string>`(array_agg(${entryPeople.name} order by ${entryPeople.createdAt} desc))[1]`,
      count: count(),
    })
    .from(entryPeople)
    .where(eq(entryPeople.userId, userId))
    .groupBy(key)
    .orderBy(desc(max(entryPeople.createdAt)));
  return rows.map((r) => ({ name: r.name, count: Number(r.count) }));
}

/** Replaces the entry's names. False when the entry isn't this person's. */
export async function setEntryNames(db: Db, userId: string, entryId: string, names: string[]): Promise<boolean> {
  const clean = parseNames(names);
  return db.transaction(async (tx) => {
    const [owned] = await tx
      .select({ id: entries.id })
      .from(entries)
      .where(and(eq(entries.id, entryId), eq(entries.userId, userId)));
    if (!owned) return false;
    const existing = await tx
      .select({ id: entryPeople.id, name: entryPeople.name })
      .from(entryPeople)
      .where(eq(entryPeople.entryId, entryId));
    const wanted = new Set(clean.map((n) => n.toLowerCase()));
    const have = new Map(existing.map((r) => [r.name.toLowerCase(), r]));
    // Keep rows whose name stays (and their place in "recently used"); remove the rest.
    const remove = existing.filter((r) => !wanted.has(r.name.toLowerCase())).map((r) => r.id);
    if (remove.length) await tx.delete(entryPeople).where(inArray(entryPeople.id, remove));
    // Same name, new spelling ("steve" → "Steve"): update it in place.
    for (const name of clean) {
      const row = have.get(name.toLowerCase());
      if (row && row.name !== name) await tx.update(entryPeople).set({ name }).where(eq(entryPeople.id, row.id));
    }
    const now = Date.now();
    const add = clean
      .filter((n) => !have.has(n.toLowerCase()))
      // A millisecond apart, so the order they were picked in is kept.
      .map((name, i) => ({ id: crypto.randomUUID(), entryId, userId, name, createdAt: new Date(now + i) }));
    if (add.length) await tx.insert(entryPeople).values(add).onConflictDoNothing();
    return true;
  });
}

/** The entries a name is on (ignoring case), and the spelling to show. */
export async function entriesWithName(db: Db, userId: string, name: string): Promise<{ name: string; entryIds: Set<string> }> {
  const rows = await db
    .select({ entryId: entryPeople.entryId, name: entryPeople.name })
    .from(entryPeople)
    .where(and(eq(entryPeople.userId, userId), sql`lower(${entryPeople.name}) = lower(${name})`))
    .orderBy(desc(entryPeople.createdAt));
  return { name: rows[0]?.name ?? name, entryIds: new Set(rows.map((r) => r.entryId)) };
}
