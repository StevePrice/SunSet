// Add to the story (Phase 4f-4, PRD 6.10e): what friends add to a shared sunset, typed or spoken.
// The only module that reads or writes story_additions.
//
// As in reactions.ts, two kinds of access are kept apart:
// - Public, by share id and visitor: a friend's own addition. Every public function checks the
//   share is live, so once a link is stopped nothing more can be added through it.
// - Owner-only, by user id: everything friends sent for an entry, playback, and Remove. Each query
//   is scoped to entries the user owns.
import { and, count, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { entries, reactionVisitors, shares, storyAdditions } from "@/db/schema";
import type { MyAddition } from "@/lib/addition-input";
import type { Db } from "@/lib/db";
import { newShareId } from "@/lib/shares";

export type AdditionClip = { r2Key: string; contentType: string; sizeBytes: number };

/** Where a friend's recording is kept: under the owner's entry, so deleting it removes the audio. */
export function additionKey(ownerId: string, entryId: string, additionId: string, extension: string): string {
  return `entries/${ownerId}/${entryId}/additions/${additionId}.${extension}`;
}

// ---- Public, by share id --------------------------------------------------------------------

/** The live share's entry and owner, or null once the link is stopped. */
export async function liveShare(db: Db, shareId: string): Promise<{ entryId: string; ownerId: string } | null> {
  const [row] = await db.select({ entryId: shares.entryId, ownerId: shares.userId }).from(shares).where(eq(shares.id, shareId));
  return row ?? null;
}

async function findMine(db: Db, shareId: string, visitorId: string) {
  const [row] = await db
    .select()
    .from(storyAdditions)
    .where(and(eq(storyAdditions.shareId, shareId), eq(storyAdditions.visitorId, visitorId)));
  return row ?? null;
}

/** This visitor's addition on this link, if any. */
export async function getMyAddition(db: Db, shareId: string, visitorId: string | null): Promise<MyAddition | null> {
  if (!visitorId) return null;
  const row = await findMine(db, shareId, visitorId);
  if (!row) return null;
  return { text: row.body, spoken: row.r2Key !== null, durationMs: row.durationMs, sent: row.sentAt !== null };
}

/**
 * A new id and R2 key for a recording, before it's uploaded. The caller stores the audio, then
 * calls saveAdditionClip. Null if the link was stopped.
 */
export async function planAdditionClip(db: Db, shareId: string, extension: string) {
  const share = await liveShare(db, shareId);
  if (!share) return null;
  const id = newShareId();
  return { ...share, id, r2Key: additionKey(share.ownerId, share.entryId, id, extension) };
}

/**
 * Keeps a just-recorded clip as the visitor's addition, replacing any earlier recording (Record
 * again). It waits for Send before the owner sees it. Returns the old recording's R2 key to delete,
 * or "not_found" if the link was stopped meanwhile.
 */
export async function saveAdditionClip(
  db: Db,
  shareId: string,
  visitorId: string,
  clip: { entryId: string; r2Key: string; contentType: string; durationMs: number; sizeBytes: number },
): Promise<{ oldKey: string | null } | "not_found"> {
  const share = await liveShare(db, shareId);
  if (!share || share.entryId !== clip.entryId) return "not_found";
  const existing = await findMine(db, shareId, visitorId);
  const fields = { r2Key: clip.r2Key, contentType: clip.contentType, durationMs: clip.durationMs, sizeBytes: clip.sizeBytes, transcript: null, sentAt: null };
  if (existing) {
    await db.update(storyAdditions).set(fields).where(eq(storyAdditions.id, existing.id));
    return { oldKey: existing.r2Key };
  }
  await db.insert(storyAdditions).values({ id: newShareId(), entryId: share.entryId, shareId, visitorId, ...fields });
  return { oldKey: null };
}

/** What speech-to-text heard in the visitor's recording (only if it's still that recording). */
export async function setAdditionTranscript(db: Db, shareId: string, visitorId: string, r2Key: string, transcript: string): Promise<void> {
  await db
    .update(storyAdditions)
    .set({ transcript })
    .where(and(eq(storyAdditions.shareId, shareId), eq(storyAdditions.visitorId, visitorId), eq(storyAdditions.r2Key, r2Key)));
}

/**
 * Send: the visitor's words, with or without their recording. The owner sees it from now on. With
 * no words and no recording kept, the addition is removed. Returns the R2 key of a recording that
 * was dropped, for the caller to delete.
 */
export async function sendAddition(
  db: Db,
  shareId: string,
  visitorId: string,
  input: { text: string | null; spoken: boolean },
  now = new Date(),
): Promise<{ status: "ok"; addition: MyAddition | null; droppedKey: string | null } | { status: "not_found" } | { status: "empty" }> {
  const share = await liveShare(db, shareId);
  if (!share) return { status: "not_found" };
  const existing = await findMine(db, shareId, visitorId);
  const keepClip = input.spoken && existing?.r2Key != null;
  const droppedKey = !keepClip && existing?.r2Key ? existing.r2Key : null;
  if (!input.text && !keepClip) {
    if (!existing) return { status: "empty" };
    await db.delete(storyAdditions).where(eq(storyAdditions.id, existing.id));
    return { status: "ok", addition: null, droppedKey };
  }
  const clipFields = keepClip ? {} : { r2Key: null, contentType: null, durationMs: null, sizeBytes: null, transcript: null };
  if (existing) {
    await db
      .update(storyAdditions)
      .set({ body: input.text, sentAt: now, ...clipFields })
      .where(eq(storyAdditions.id, existing.id));
  } else {
    await db.insert(storyAdditions).values({ id: newShareId(), entryId: share.entryId, shareId, visitorId, body: input.text, sentAt: now });
  }
  return { status: "ok", addition: await getMyAddition(db, shareId, visitorId), droppedKey };
}

// ---- Owner only, by user id -----------------------------------------------------------------

const ownedEntries = (db: Db, userId: string) => db.select({ id: entries.id }).from(entries).where(eq(entries.userId, userId));

export type Addition = {
  id: string;
  name: string;
  text: string | null;
  spoken: boolean;
  durationMs: number | null;
  /** The words came from speech-to-text ("Spoken, written down by AI"). */
  transcribed: boolean;
  sentAt: Date;
};

/** What friends added to one entry, newest first. Only sent ones. Empty if the user doesn't own it. */
export async function listAdditions(db: Db, userId: string, entryId: string): Promise<Addition[]> {
  const rows = await db
    .select({
      id: storyAdditions.id,
      name: reactionVisitors.name,
      body: storyAdditions.body,
      r2Key: storyAdditions.r2Key,
      durationMs: storyAdditions.durationMs,
      transcript: storyAdditions.transcript,
      sentAt: storyAdditions.sentAt,
    })
    .from(storyAdditions)
    .innerJoin(entries, eq(entries.id, storyAdditions.entryId))
    .innerJoin(reactionVisitors, eq(reactionVisitors.id, storyAdditions.visitorId))
    .where(and(eq(storyAdditions.entryId, entryId), eq(entries.userId, userId), isNotNull(storyAdditions.sentAt)))
    .orderBy(desc(storyAdditions.sentAt));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    text: r.body,
    spoken: r.r2Key !== null,
    durationMs: r.durationMs,
    transcribed: r.r2Key !== null && r.transcript !== null,
    sentAt: r.sentAt!,
  }));
}

/** How many friends added to the story, for the "See what friends sent" row. */
export async function countAdditions(db: Db, userId: string, entryId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(storyAdditions)
    .where(and(eq(storyAdditions.entryId, entryId), isNotNull(storyAdditions.sentAt), inArray(storyAdditions.entryId, ownedEntries(db, userId))));
  return row?.n ?? 0;
}

/** A sent recording, for its owner to play. */
export async function getAdditionClip(db: Db, userId: string, additionId: string): Promise<AdditionClip | null> {
  const [row] = await db
    .select({ r2Key: storyAdditions.r2Key, contentType: storyAdditions.contentType, sizeBytes: storyAdditions.sizeBytes })
    .from(storyAdditions)
    .where(and(eq(storyAdditions.id, additionId), isNotNull(storyAdditions.sentAt), inArray(storyAdditions.entryId, ownedEntries(db, userId))));
  if (!row?.r2Key || !row.contentType || row.sizeBytes === null) return null;
  return { r2Key: row.r2Key, contentType: row.contentType, sizeBytes: row.sizeBytes };
}

/** Every recording friends left on an entry (sent or not), for deleting the entry's files. */
export async function additionKeysForEntry(db: Db, userId: string, entryId: string): Promise<string[]> {
  const rows = await db
    .select({ r2Key: storyAdditions.r2Key })
    .from(storyAdditions)
    .where(and(eq(storyAdditions.entryId, entryId), isNotNull(storyAdditions.r2Key), inArray(storyAdditions.entryId, ownedEntries(db, userId))));
  return rows.map((r) => r.r2Key!);
}

/** Remove: deletes one addition. Returns whether it existed, and its recording's R2 key to delete. */
export async function deleteAddition(db: Db, userId: string, additionId: string): Promise<{ deleted: boolean; r2Key: string | null }> {
  const rows = await db
    .delete(storyAdditions)
    .where(and(eq(storyAdditions.id, additionId), inArray(storyAdditions.entryId, ownedEntries(db, userId))))
    .returning({ r2Key: storyAdditions.r2Key });
  return { deleted: rows.length > 0, r2Key: rows[0]?.r2Key ?? null };
}
