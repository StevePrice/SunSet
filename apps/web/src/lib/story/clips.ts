// Voice recordings for AI Story Capture, one clip per spoken answer. Like entries.ts, every
// function is scoped to the owner. The audio itself lives in R2 next to the entry's photos; callers
// delete the R2 objects using the keys these functions return.
import { and, asc, count, eq, inArray } from "drizzle-orm";
import { entries, storyClips, storySessions, type StoryTurn } from "@/db/schema";
import type { Db } from "@/lib/db";

export type StoryClip = typeof storyClips.$inferSelect;

export function clipKey(userId: string, entryId: string, clipId: string, extension: string): string {
  return `entries/${userId}/${entryId}/clips/${clipId}.${extension}`;
}

/** Records a stored clip. Null if the user doesn't own the entry. */
export async function createClip(
  db: Db,
  userId: string,
  entryId: string,
  clip: { id: string; r2Key: string; contentType: string; durationMs: number; sizeBytes: number },
): Promise<StoryClip | null> {
  const [owned] = await db
    .select({ id: entries.id })
    .from(entries)
    .where(and(eq(entries.id, entryId), eq(entries.userId, userId)));
  if (!owned) return null;
  const [row] = await db
    .insert(storyClips)
    .values({ ...clip, entryId, userId })
    .returning();
  return row;
}

export async function getClip(db: Db, userId: string, clipId: string): Promise<StoryClip | null> {
  const [row] = await db
    .select()
    .from(storyClips)
    .where(and(eq(storyClips.id, clipId), eq(storyClips.userId, userId)));
  return row ?? null;
}

/** An entry's clips in the order they were recorded. */
export function listClips(db: Db, userId: string, entryId: string): Promise<StoryClip[]> {
  return db
    .select()
    .from(storyClips)
    .where(and(eq(storyClips.entryId, entryId), eq(storyClips.userId, userId)))
    .orderBy(asc(storyClips.createdAt));
}

/** The clips with these IDs that belong to this user and entry. */
export async function clipsForAnswer(db: Db, userId: string, entryId: string, clipIds: string[]): Promise<StoryClip[]> {
  if (!clipIds.length) return [];
  return db
    .select()
    .from(storyClips)
    .where(and(inArray(storyClips.id, clipIds), eq(storyClips.entryId, entryId), eq(storyClips.userId, userId)));
}

export async function setClipTranscript(db: Db, userId: string, clipId: string, transcript: string): Promise<void> {
  await db
    .update(storyClips)
    .set({ transcript })
    .where(and(eq(storyClips.id, clipId), eq(storyClips.userId, userId)));
}

export async function countRecordings(db: Db, userId: string): Promise<number> {
  const [row] = await db.select({ n: count() }).from(storyClips).where(eq(storyClips.userId, userId));
  return row?.n ?? 0;
}

/** Turns with their recording links removed; the words, and whether they were spoken, stay. */
export function withoutClips(turns: StoryTurn[]): StoryTurn[] {
  return turns.map((turn) => {
    const rest = { ...turn };
    delete rest.clipIds;
    return rest;
  });
}

async function deleteClips(db: Db, userId: string, entryId: string | null): Promise<string[]> {
  const where = entryId
    ? and(eq(storyClips.userId, userId), eq(storyClips.entryId, entryId))
    : eq(storyClips.userId, userId);
  const deleted = await db.delete(storyClips).where(where).returning({ r2Key: storyClips.r2Key, entryId: storyClips.entryId });
  const entryIds = [...new Set(deleted.map((c) => c.entryId))];
  if (entryIds.length) {
    const sessions = await db
      .select({ entryId: storySessions.entryId, turns: storySessions.turns })
      .from(storySessions)
      .where(and(eq(storySessions.userId, userId), inArray(storySessions.entryId, entryIds)));
    for (const session of sessions) {
      await db
        .update(storySessions)
        .set({ turns: withoutClips(session.turns) })
        .where(and(eq(storySessions.entryId, session.entryId), eq(storySessions.userId, userId)));
    }
  }
  return deleted.map((c) => c.r2Key);
}

/** "Delete recording" on Entry Detail. Returns the R2 keys to delete; the text is kept. */
export function deleteEntryRecordings(db: Db, userId: string, entryId: string): Promise<string[]> {
  return deleteClips(db, userId, entryId);
}

/** "Delete all recordings" in Settings. Returns the R2 keys to delete; stories and transcripts stay. */
export function deleteAllRecordings(db: Db, userId: string): Promise<string[]> {
  return deleteClips(db, userId, null);
}
