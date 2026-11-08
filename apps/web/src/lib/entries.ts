// The only module that reads or writes Journal entries. Every function takes the signed-in
// user's ID and scopes its query to it, so one user can never see or change another's entries.
import { SCORER_VERSION } from "@sunset/scoring";
import { and, desc, eq } from "drizzle-orm";
import { entries, entryScores } from "@/db/schema";
import type { Db } from "@/lib/db";
import type { EntryInput, Location } from "@/lib/entry-input";

export type Entry = {
  id: string;
  story: string | null;
  title: string | null;
  caption: string | null;
  takenAt: Date;
  location: Location | null;
  photoWidth: number;
  photoHeight: number;
  createdAt: Date;
};

const columns = {
  id: entries.id,
  story: entries.story,
  title: entries.title,
  caption: entries.caption,
  takenAt: entries.takenAt,
  location: entries.location,
  photoWidth: entries.photoWidth,
  photoHeight: entries.photoHeight,
  createdAt: entries.createdAt,
};

function toEntry(row: {
  id: string;
  story: string | null;
  title: string | null;
  caption: string | null;
  takenAt: Date;
  location: { x: number; y: number } | null;
  photoWidth: number;
  photoHeight: number;
  createdAt: Date;
}): Entry {
  const { location, ...rest } = row;
  return { ...rest, location: location && { latitude: location.y, longitude: location.x } };
}

export { entryPhotoKeys, photoKey } from "@sunset/db/photos";

export async function createEntry(db: Db, userId: string, id: string, input: EntryInput): Promise<Entry> {
  const [row] = await db
    .insert(entries)
    .values({
      id,
      userId,
      story: input.story,
      takenAt: input.takenAt ?? new Date(),
      location: input.location && { x: input.location.longitude, y: input.location.latitude },
      photoWidth: input.photoWidth,
      photoHeight: input.photoHeight,
    })
    .returning(columns);
  return toEntry(row);
}

export async function listEntries(db: Db, userId: string): Promise<(Entry & { displayScore: number | null })[]> {
  const rows = await db
    .select({ ...columns, displayScore: entryScores.displayScore })
    .from(entries)
    .leftJoin(
      entryScores,
      and(eq(entryScores.entryId, entries.id), eq(entryScores.scorerVersion, SCORER_VERSION)),
    )
    .where(eq(entries.userId, userId))
    .orderBy(desc(entries.takenAt), desc(entries.createdAt));
  return rows.map(({ displayScore, ...row }) => ({ ...toEntry(row), displayScore }));
}

export async function getEntry(db: Db, userId: string, id: string): Promise<Entry | null> {
  const [row] = await db
    .select(columns)
    .from(entries)
    .where(and(eq(entries.id, id), eq(entries.userId, userId)));
  return row ? toEntry(row) : null;
}

export async function updateEntry(
  db: Db,
  userId: string,
  id: string,
  changes: { story: string | null; location?: Location | null },
): Promise<boolean> {
  const rows = await db
    .update(entries)
    .set({
      story: changes.story,
      ...(changes.location !== undefined && {
        location: changes.location && { x: changes.location.longitude, y: changes.location.latitude },
      }),
    })
    .where(and(eq(entries.id, id), eq(entries.userId, userId)))
    .returning({ id: entries.id });
  return rows.length > 0;
}

export async function deleteEntry(db: Db, userId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(entries)
    .where(and(eq(entries.id, id), eq(entries.userId, userId)))
    .returning({ id: entries.id });
  return rows.length > 0;
}
