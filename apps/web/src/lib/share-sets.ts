// Shared sets (Phase 4f-5, PRD 6.10d, Build Spec 2.3–2.5): "Send Steve all your sunsets together".
// The only module that reads or writes share_sets, share_set_entries, set_reactions and set_notes.
//
// As in reactions.ts, two kinds of access are kept apart:
// - Public, by set id: what the set page shows, and one reply per friend for the whole set. Every
//   public function checks the set is live, so once it's stopped nothing can be read or sent.
// - Owner-only, by user id: making, changing and stopping a set, and reading and removing replies.
import { and, asc, count, eq, inArray, isNull, sql } from "drizzle-orm";
import { entries, entryPeople, reactionVisitors, setNotes, setReactions, shareSetEntries, shareSets, storyClips, users } from "@/db/schema";
import type { Db } from "@/lib/db";
import { parseName } from "@/lib/people-input";
import { hitRateLimit } from "@/lib/rate-limit";
import { REACTION_KINDS, type PublicReactions, type ReactionKind } from "@/lib/reaction-input";
import { createVisitor, getVisitorName, groupByFriend, MAX_VISITOR_CHANGES_PER_ENTRY, tally, type Afterglow } from "@/lib/reactions";
import { MAX_SET_SIZE } from "@/lib/share-set-input";
import { newShareId } from "@/lib/shares";

const VISITOR_WINDOW_MS = 24 * 60 * 60 * 1000;
const sameName = (column: typeof shareSets.personName | typeof entryPeople.name, name: string) => sql`lower(${column}) = lower(${name})`;

// ---- Owner only, by user id -----------------------------------------------------------------

export type OwnerSet = { id: string; personName: string; includeVoice: boolean; entryIds: string[]; createdAt: Date };

/** The live set for this person, if the owner has shared one. */
export async function getLiveSet(db: Db, userId: string, personName: string): Promise<OwnerSet | null> {
  const [set] = await db
    .select({ id: shareSets.id, personName: shareSets.personName, includeVoice: shareSets.includeVoice, createdAt: shareSets.createdAt })
    .from(shareSets)
    .where(and(eq(shareSets.userId, userId), sameName(shareSets.personName, personName), isNull(shareSets.stoppedAt)));
  if (!set) return null;
  const rows = await db
    .select({ entryId: shareSetEntries.entryId })
    .from(shareSetEntries)
    .where(eq(shareSetEntries.setId, set.id))
    .orderBy(asc(shareSetEntries.position));
  return { ...set, entryIds: rows.map((r) => r.entryId) };
}

/**
 * Shares these sunsets with the person as one link: a new set, or the person's live set changed
 * (same link). Only the owner's sunsets with that name are kept, in the order given. Returns the set
 * id and how many sunsets are in it, or null if none of them qualify.
 */
export async function shareSet(
  db: Db,
  userId: string,
  input: { personName: string; entryIds: string[]; includeVoice: boolean; timeZone: string },
): Promise<{ id: string; count: number; isNew: boolean } | null> {
  const personName = parseName(input.personName);
  if (!personName || !input.entryIds.length) return null;
  return db.transaction(async (tx) => {
    const tagged = await tx
      .select({ entryId: entryPeople.entryId })
      .from(entryPeople)
      .innerJoin(entries, eq(entries.id, entryPeople.entryId))
      .where(and(eq(entries.userId, userId), sameName(entryPeople.name, personName), inArray(entryPeople.entryId, input.entryIds)));
    const allowed = new Set(tagged.map((r) => r.entryId));
    const entryIds = input.entryIds.filter((id) => allowed.has(id)).slice(0, MAX_SET_SIZE);
    if (!entryIds.length) return null;

    const live = and(eq(shareSets.userId, userId), sameName(shareSets.personName, personName), isNull(shareSets.stoppedAt));
    const [existing] = await tx.select({ id: shareSets.id }).from(shareSets).where(live);
    let id = existing?.id;
    if (id) {
      await tx.update(shareSets).set({ includeVoice: input.includeVoice, personName }).where(eq(shareSets.id, id));
      await tx.delete(shareSetEntries).where(eq(shareSetEntries.setId, id));
    } else {
      id = newShareId();
      await tx.insert(shareSets).values({ id, userId, personName, includeVoice: input.includeVoice, timeZone: input.timeZone });
    }
    await tx.insert(shareSetEntries).values(entryIds.map((entryId, position) => ({ setId: id, entryId, position })));
    return { id, count: entryIds.length, isNew: !existing };
  });
}

/** Stop sharing: the link stops working for good; the owner keeps the replies. */
export async function stopSet(db: Db, userId: string, setId: string): Promise<boolean> {
  const rows = await db
    .update(shareSets)
    .set({ stoppedAt: new Date() })
    .where(and(eq(shareSets.id, setId), eq(shareSets.userId, userId), isNull(shareSets.stoppedAt)))
    .returning({ id: shareSets.id });
  return rows.length > 0;
}

/**
 * Turns the owner's voice off on their sets: all of them ("Delete all recordings"), or the ones
 * with this sunset in them (deleting its recording), so a new recording is never shared unasked.
 */
export async function stopSetVoices(db: Db, userId: string, entryId?: string): Promise<void> {
  const withEntry = entryId
    ? inArray(shareSets.id, db.select({ id: shareSetEntries.setId }).from(shareSetEntries).where(eq(shareSetEntries.entryId, entryId)))
    : undefined;
  await db.update(shareSets).set({ includeVoice: false }).where(and(eq(shareSets.userId, userId), withEntry));
}

export type SetReplies = Afterglow & {
  /** The visitors who came through a set link (it's always for the named person): "I was there!". */
  inSet: Set<string>;
};

/** Every reply to the owner's sets for this person, live or stopped, with names and notes. */
export async function getSetReplies(db: Db, userId: string, personName: string): Promise<SetReplies> {
  const sets = await db
    .select({ id: shareSets.id, visitorId: shareSets.visitorId })
    .from(shareSets)
    .where(and(eq(shareSets.userId, userId), sameName(shareSets.personName, personName)));
  if (!sets.length) return { ...groupByFriend([], []), inSet: new Set() };
  const ids = sets.map((s) => s.id);
  const [reactionRows, noteRows] = await Promise.all([
    db
      .select({ id: setReactions.id, kind: setReactions.kind, visitorId: setReactions.visitorId, name: reactionVisitors.name, at: setReactions.createdAt })
      .from(setReactions)
      .innerJoin(reactionVisitors, eq(reactionVisitors.id, setReactions.visitorId))
      .where(inArray(setReactions.setId, ids))
      .orderBy(asc(setReactions.createdAt)),
    db
      .select({ id: setNotes.id, body: setNotes.body, visitorId: setNotes.visitorId, name: reactionVisitors.name, at: setNotes.updatedAt })
      .from(setNotes)
      .innerJoin(reactionVisitors, eq(reactionVisitors.id, setNotes.visitorId))
      .where(inArray(setNotes.setId, ids))
      .orderBy(asc(setNotes.updatedAt)),
  ]);
  return { ...groupByFriend(reactionRows, noteRows), inSet: new Set(sets.flatMap((s) => (s.visitorId ? [s.visitorId] : []))) };
}

const ownedSets = (db: Db, userId: string) => db.select({ id: shareSets.id }).from(shareSets).where(eq(shareSets.userId, userId));

export async function deleteSetReaction(db: Db, userId: string, reactionId: string): Promise<boolean> {
  const rows = await db
    .delete(setReactions)
    .where(and(eq(setReactions.id, reactionId), inArray(setReactions.setId, ownedSets(db, userId))))
    .returning({ id: setReactions.id });
  return rows.length > 0;
}

export async function deleteSetNote(db: Db, userId: string, noteId: string): Promise<boolean> {
  const rows = await db
    .delete(setNotes)
    .where(and(eq(setNotes.id, noteId), inArray(setNotes.setId, ownedSets(db, userId))))
    .returning({ id: setNotes.id });
  return rows.length > 0;
}

/** Every set the owner made, for Download your sunsets. */
export async function listSetsForExport(db: Db, userId: string) {
  const sets = await db
    .select({ id: shareSets.id, personName: shareSets.personName, createdAt: shareSets.createdAt, stoppedAt: shareSets.stoppedAt })
    .from(shareSets)
    .where(eq(shareSets.userId, userId))
    .orderBy(asc(shareSets.createdAt));
  if (!sets.length) return [];
  const ids = sets.map((s) => s.id);
  const [members, reactionRows, noteRows] = await Promise.all([
    db
      .select({ setId: shareSetEntries.setId, entryId: shareSetEntries.entryId })
      .from(shareSetEntries)
      .where(inArray(shareSetEntries.setId, ids))
      .orderBy(asc(shareSetEntries.position)),
    db
      .select({ setId: setReactions.setId, kind: setReactions.kind, name: reactionVisitors.name, at: setReactions.createdAt })
      .from(setReactions)
      .innerJoin(reactionVisitors, eq(reactionVisitors.id, setReactions.visitorId))
      .where(inArray(setReactions.setId, ids)),
    db
      .select({ setId: setNotes.setId, body: setNotes.body, name: reactionVisitors.name, at: setNotes.updatedAt })
      .from(setNotes)
      .innerJoin(reactionVisitors, eq(reactionVisitors.id, setNotes.visitorId))
      .where(inArray(setNotes.setId, ids)),
  ]);
  return sets.map((s) => ({
    sharedWith: s.personName,
    sharedAt: s.createdAt.toISOString(),
    stoppedAt: s.stoppedAt?.toISOString() ?? null,
    entryIds: members.filter((m) => m.setId === s.id).map((m) => m.entryId),
    reactions: reactionRows.filter((r) => r.setId === s.id).map((r) => ({ from: r.name, kind: r.kind, at: r.at.toISOString() })),
    notes: noteRows.filter((n) => n.setId === s.id).map((n) => ({ from: n.name, note: n.body, at: n.at.toISOString() })),
  }));
}

// ---- Public, by set id ----------------------------------------------------------------------

export type PublicSetEntry = {
  entryId: string;
  title: string | null;
  story: string | null;
  takenAt: Date;
  timeZone: string;
  /** The place in words (a town), never the exact location. */
  place: string | null;
  photoWidth: number;
  photoHeight: number;
  /** The owner's recordings for this sunset, when the set includes the voice. */
  clips: { id: string; durationMs: number }[];
};

export type PublicSet = {
  id: string;
  ownerId: string;
  ownerName: string | null;
  personName: string;
  includeVoice: boolean;
  entries: PublicSetEntry[];
};

async function liveSet(db: Db, setId: string) {
  const [row] = await db
    .select({ id: shareSets.id, ownerId: shareSets.userId, personName: shareSets.personName, includeVoice: shareSets.includeVoice, timeZone: shareSets.timeZone, visitorId: shareSets.visitorId })
    .from(shareSets)
    .where(and(eq(shareSets.id, setId), isNull(shareSets.stoppedAt)));
  return row ?? null;
}

/** What the set page shows, or null once it's stopped or every sunset in it was deleted. */
export async function getPublicSet(db: Db, setId: string): Promise<PublicSet | null> {
  const set = await liveSet(db, setId);
  if (!set) return null;
  const [owner] = await db.select({ name: users.name }).from(users).where(eq(users.id, set.ownerId));
  const rows = await db
    .select({
      entryId: entries.id,
      title: entries.title,
      story: entries.story,
      takenAt: entries.takenAt,
      timeZone: sql<string>`coalesce(${entries.timeZone}, ${set.timeZone})`,
      place: entries.placeName,
      photoWidth: entries.photoWidth,
      photoHeight: entries.photoHeight,
    })
    .from(shareSetEntries)
    .innerJoin(entries, eq(entries.id, shareSetEntries.entryId))
    .where(and(eq(shareSetEntries.setId, setId), eq(entries.userId, set.ownerId)))
    .orderBy(asc(shareSetEntries.position));
  if (!rows.length) return null;
  const clips = set.includeVoice
    ? await db
        .select({ id: storyClips.id, entryId: storyClips.entryId, durationMs: storyClips.durationMs })
        .from(storyClips)
        .where(and(eq(storyClips.userId, set.ownerId), inArray(storyClips.entryId, rows.map((r) => r.entryId))))
        .orderBy(asc(storyClips.createdAt))
    : [];
  return {
    id: set.id,
    ownerId: set.ownerId,
    ownerName: owner?.name.trim() || null,
    personName: set.personName,
    includeVoice: set.includeVoice,
    entries: rows.map((r) => ({ ...r, clips: clips.filter((c) => c.entryId === r.entryId).map(({ id, durationMs }) => ({ id, durationMs })) })),
  };
}

/** The owner of a sunset in a live set, for its photo and voice; null otherwise. */
export async function setEntryOwner(db: Db, setId: string, entryId: string): Promise<{ ownerId: string; includeVoice: boolean } | null> {
  const [row] = await db
    .select({ ownerId: shareSets.userId, includeVoice: shareSets.includeVoice })
    .from(shareSets)
    .innerJoin(shareSetEntries, eq(shareSetEntries.setId, shareSets.id))
    .innerJoin(entries, and(eq(entries.id, shareSetEntries.entryId), eq(entries.userId, shareSets.userId)))
    .where(and(eq(shareSets.id, setId), eq(shareSetEntries.entryId, entryId), isNull(shareSets.stoppedAt)));
  return row ?? null;
}

/**
 * Who is replying to the set: the visitor in their cookie, or a new one named for the person the
 * set is for (a set link never asks for a name). The first visitor is remembered as the person, so
 * their "Wish I was there" shows as "I was there!".
 */
export async function resolveSetVisitor(
  db: Db,
  setId: string,
  cookieId: string | null,
): Promise<{ status: "ok"; visitorId: string; isNew: boolean } | { status: "not_found" }> {
  const set = await liveSet(db, setId);
  if (!set) return { status: "not_found" };
  let visitorId = cookieId && (await getVisitorName(db, cookieId)) !== null ? cookieId : null;
  const isNew = !visitorId;
  if (!visitorId) visitorId = await createVisitor(db, set.personName);
  if (!set.visitorId) {
    await db.update(shareSets).set({ visitorId }).where(and(eq(shareSets.id, setId), isNull(shareSets.visitorId)));
  }
  return { status: "ok", visitorId, isNew };
}

/** Counts for a live set, plus this visitor's own reactions and note. Null once it's stopped. */
export async function getPublicSetReactions(db: Db, setId: string, visitorId: string | null): Promise<PublicReactions | null> {
  if (!(await liveSet(db, setId))) return null;
  const rows = await db
    .select({ kind: setReactions.kind, n: count() })
    .from(setReactions)
    .where(eq(setReactions.setId, setId))
    .groupBy(setReactions.kind);
  if (!visitorId) return { counts: tally(rows), mine: [], note: null, name: null };
  const [mine, [note], name] = await Promise.all([
    db
      .select({ kind: setReactions.kind })
      .from(setReactions)
      .where(and(eq(setReactions.setId, setId), eq(setReactions.visitorId, visitorId))),
    db
      .select({ body: setNotes.body })
      .from(setNotes)
      .where(and(eq(setNotes.setId, setId), eq(setNotes.visitorId, visitorId))),
    getVisitorName(db, visitorId),
  ]);
  return { counts: tally(rows), mine: REACTION_KINDS.filter((k) => mine.some((m) => m.kind === k)), note: note?.body ?? null, name };
}

export type SetReactionResult = { status: "ok"; reactions: PublicReactions } | { status: "not_found" } | { status: "limited" };

async function beginChange(db: Db, setId: string, visitorId: string, now: number) {
  if (!(await liveSet(db, setId))) return { status: "not_found" as const };
  const allowed = await hitRateLimit(db, `reactions:visitor:${visitorId}:set:${setId}`, MAX_VISITOR_CHANGES_PER_ENTRY, VISITOR_WINDOW_MS, now);
  return allowed ? { status: "ok" as const } : { status: "limited" as const };
}

async function finish(db: Db, setId: string, visitorId: string): Promise<SetReactionResult> {
  const state = await getPublicSetReactions(db, setId, visitorId);
  return state ? { status: "ok", reactions: state } : { status: "not_found" };
}

/** Adds the reaction to the set, or takes it back if the visitor already chose it. */
export async function toggleSetReaction(db: Db, setId: string, visitorId: string, kind: ReactionKind, now = Date.now()): Promise<SetReactionResult> {
  const begun = await beginChange(db, setId, visitorId, now);
  if (begun.status !== "ok") return begun;
  const removed = await db
    .delete(setReactions)
    .where(and(eq(setReactions.setId, setId), eq(setReactions.visitorId, visitorId), eq(setReactions.kind, kind)))
    .returning({ id: setReactions.id });
  if (!removed.length) await db.insert(setReactions).values({ id: crypto.randomUUID(), setId, visitorId, kind }).onConflictDoNothing();
  return finish(db, setId, visitorId);
}

/** Sets the visitor's one note on the set; null removes it. */
export async function setSetNote(db: Db, setId: string, visitorId: string, body: string | null, now = Date.now()): Promise<SetReactionResult> {
  const begun = await beginChange(db, setId, visitorId, now);
  if (begun.status !== "ok") return begun;
  if (body === null) {
    await db.delete(setNotes).where(and(eq(setNotes.setId, setId), eq(setNotes.visitorId, visitorId)));
  } else {
    await db
      .insert(setNotes)
      .values({ id: crypto.randomUUID(), setId, visitorId, body })
      .onConflictDoUpdate({ target: [setNotes.setId, setNotes.visitorId], set: { body, updatedAt: new Date() } });
  }
  return finish(db, setId, visitorId);
}
