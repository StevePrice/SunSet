// Friend reactions on shared sunsets (Phase 4b, PRD 6.9). The only module that reads or writes
// reactions, notes and reaction visitors.
//
// Two kinds of access, kept apart:
// - Public, by share id: counts for anyone with the link, and a visitor's own choices. Every
//   public function joins `shares`, so once a link is stopped nothing here can reach its reactions.
// - Owner-only, by user id: names and notes (Afterglow), deleting, and Journal totals. Each one
//   scopes its query to entries the user owns, like entries.ts.
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { entries, reactionNotes, reactionVisitors, reactions, shares } from "@/db/schema";
import type { Db } from "@/lib/db";
import { hitRateLimit } from "@/lib/rate-limit";
import {
  emptyCounts,
  REACTION_KINDS,
  type PublicReactions,
  type ReactionCounts,
  type ReactionKind,
} from "@/lib/reaction-input";
import { newShareId } from "@/lib/shares";

/** Spam limit: changes (taps and notes) one visitor can make on one entry per day. */
export const MAX_VISITOR_CHANGES_PER_ENTRY = 30;
const VISITOR_WINDOW_MS = 24 * 60 * 60 * 1000;

export type ReactionResult = { status: "ok"; reactions: PublicReactions } | { status: "not_found" } | { status: "limited" };

const isKind = (k: string): k is ReactionKind => (REACTION_KINDS as readonly string[]).includes(k);

function tally(rows: { kind: string; n: number }[]): ReactionCounts {
  const counts = emptyCounts();
  for (const { kind, n } of rows) if (isKind(kind)) counts[kind] = n;
  return counts;
}

// ---- Visitors -------------------------------------------------------------------------------

/** A new anonymous visitor, remembered by the returned id (stored in their cookie). */
export async function createVisitor(db: Db, name: string): Promise<string> {
  const id = newShareId();
  await db.insert(reactionVisitors).values({ id, name });
  return id;
}

export async function getVisitorName(db: Db, visitorId: string): Promise<string | null> {
  const [row] = await db.select({ name: reactionVisitors.name }).from(reactionVisitors).where(eq(reactionVisitors.id, visitorId));
  return row?.name ?? null;
}

// ---- Public, by share id --------------------------------------------------------------------

async function shareEntry(db: Db, shareId: string): Promise<string | null> {
  const [row] = await db.select({ entryId: shares.entryId }).from(shares).where(eq(shares.id, shareId));
  return row?.entryId ?? null;
}

/** Counts for a live share, plus this visitor's own reactions and note. Null if the link is stopped. */
export async function getPublicReactions(db: Db, shareId: string, visitorId: string | null): Promise<PublicReactions | null> {
  if (!(await shareEntry(db, shareId))) return null;
  const rows = await db
    .select({ kind: reactions.kind, n: count() })
    .from(reactions)
    .where(eq(reactions.shareId, shareId))
    .groupBy(reactions.kind);
  if (!visitorId) return { counts: tally(rows), mine: [], note: null, name: null };

  const [mine, [note], name] = await Promise.all([
    db
      .select({ kind: reactions.kind })
      .from(reactions)
      .where(and(eq(reactions.shareId, shareId), eq(reactions.visitorId, visitorId))),
    db
      .select({ body: reactionNotes.body })
      .from(reactionNotes)
      .where(and(eq(reactionNotes.shareId, shareId), eq(reactionNotes.visitorId, visitorId))),
    getVisitorName(db, visitorId),
  ]);
  return {
    counts: tally(rows),
    mine: REACTION_KINDS.filter((k) => mine.some((m) => m.kind === k)),
    note: note?.body ?? null,
    name,
  };
}

/** Checks the share is live and the visitor is under the spam limit; returns the entry id. */
async function beginChange(db: Db, shareId: string, visitorId: string, now: number) {
  const entryId = await shareEntry(db, shareId);
  if (!entryId) return { status: "not_found" as const };
  const allowed = await hitRateLimit(
    db,
    `reactions:visitor:${visitorId}:${entryId}`,
    MAX_VISITOR_CHANGES_PER_ENTRY,
    VISITOR_WINDOW_MS,
    now,
  );
  return allowed ? { status: "ok" as const, entryId } : { status: "limited" as const };
}

async function finish(db: Db, shareId: string, visitorId: string): Promise<ReactionResult> {
  const state = await getPublicReactions(db, shareId, visitorId);
  return state ? { status: "ok", reactions: state } : { status: "not_found" };
}

/** Adds the reaction, or takes it back if the visitor already chose it. */
export async function toggleReaction(
  db: Db,
  shareId: string,
  visitorId: string,
  kind: ReactionKind,
  now = Date.now(),
): Promise<ReactionResult> {
  const begun = await beginChange(db, shareId, visitorId, now);
  if (begun.status !== "ok") return begun;
  const removed = await db
    .delete(reactions)
    .where(and(eq(reactions.shareId, shareId), eq(reactions.visitorId, visitorId), eq(reactions.kind, kind)))
    .returning({ id: reactions.id });
  if (removed.length === 0) {
    await db
      .insert(reactions)
      .values({ id: crypto.randomUUID(), entryId: begun.entryId, shareId, visitorId, kind })
      .onConflictDoNothing();
  }
  return finish(db, shareId, visitorId);
}

/** Sets the visitor's one note on this share; null removes it. */
export async function setReactionNote(
  db: Db,
  shareId: string,
  visitorId: string,
  body: string | null,
  now = Date.now(),
): Promise<ReactionResult> {
  const begun = await beginChange(db, shareId, visitorId, now);
  if (begun.status !== "ok") return begun;
  if (body === null) {
    await db.delete(reactionNotes).where(and(eq(reactionNotes.shareId, shareId), eq(reactionNotes.visitorId, visitorId)));
  } else {
    await db
      .insert(reactionNotes)
      .values({ id: crypto.randomUUID(), entryId: begun.entryId, shareId, visitorId, body })
      .onConflictDoUpdate({ target: [reactionNotes.shareId, reactionNotes.visitorId], set: { body } });
  }
  return finish(db, shareId, visitorId);
}

// ---- Owner only, by user id -----------------------------------------------------------------

const ownedEntries = (db: Db, userId: string) =>
  db.select({ id: entries.id }).from(entries).where(eq(entries.userId, userId));

export type AfterglowPerson = {
  visitorId: string;
  name: string;
  reactions: { id: string; kind: ReactionKind }[];
  note: { id: string; body: string } | null;
};

export type Afterglow = { counts: ReactionCounts; people: AfterglowPerson[] };

/** Everything friends sent for one entry, with names and notes. Null if the user doesn't own it. */
export async function getAfterglow(db: Db, userId: string, entryId: string): Promise<Afterglow | null> {
  const [owned] = await db
    .select({ id: entries.id })
    .from(entries)
    .where(and(eq(entries.id, entryId), eq(entries.userId, userId)));
  if (!owned) return null;

  const [reactionRows, noteRows] = await Promise.all([
    db
      .select({ id: reactions.id, kind: reactions.kind, visitorId: reactions.visitorId, name: reactionVisitors.name, at: reactions.createdAt })
      .from(reactions)
      .innerJoin(reactionVisitors, eq(reactionVisitors.id, reactions.visitorId))
      .where(eq(reactions.entryId, entryId))
      .orderBy(asc(reactions.createdAt)),
    db
      .select({ id: reactionNotes.id, body: reactionNotes.body, visitorId: reactionNotes.visitorId, name: reactionVisitors.name, at: reactionNotes.createdAt })
      .from(reactionNotes)
      .innerJoin(reactionVisitors, eq(reactionVisitors.id, reactionNotes.visitorId))
      .where(eq(reactionNotes.entryId, entryId))
      .orderBy(asc(reactionNotes.createdAt)),
  ]);

  // One row per friend, in the order they first reacted.
  const people = new Map<string, AfterglowPerson & { at: Date }>();
  const person = (visitorId: string, name: string, at: Date) => {
    let p = people.get(visitorId);
    if (!p) people.set(visitorId, (p = { visitorId, name, reactions: [], note: null, at }));
    if (at < p.at) p.at = at;
    return p;
  };
  const counts = emptyCounts();
  for (const r of reactionRows) {
    if (!isKind(r.kind)) continue;
    counts[r.kind] += 1;
    person(r.visitorId, r.name, r.at).reactions.push({ id: r.id, kind: r.kind });
  }
  // A visitor who reacted on an older, stopped link and again on a new one keeps the latest note.
  for (const n of noteRows) person(n.visitorId, n.name, n.at).note = { id: n.id, body: n.body };
  for (const p of people.values()) p.reactions.sort((a, b) => REACTION_KINDS.indexOf(a.kind) - REACTION_KINDS.indexOf(b.kind));

  return {
    counts,
    people: [...people.values()].sort((a, b) => a.at.getTime() - b.at.getTime()).map(({ at: _at, ...p }) => p),
  };
}

export async function deleteReaction(db: Db, userId: string, reactionId: string): Promise<boolean> {
  const rows = await db
    .delete(reactions)
    .where(and(eq(reactions.id, reactionId), inArray(reactions.entryId, ownedEntries(db, userId))))
    .returning({ id: reactions.id });
  return rows.length > 0;
}

export async function deleteReactionNote(db: Db, userId: string, noteId: string): Promise<boolean> {
  const rows = await db
    .delete(reactionNotes)
    .where(and(eq(reactionNotes.id, noteId), inArray(reactionNotes.entryId, ownedEntries(db, userId))))
    .returning({ id: reactionNotes.id });
  return rows.length > 0;
}

/** Number of reactions on each of the user's entries that has any, for the Journal indicator. */
export async function reactionTotals(db: Db, userId: string): Promise<Map<string, number>> {
  const rows = await db
    .select({ entryId: reactions.entryId, n: sql<number>`count(*)::int` })
    .from(reactions)
    .innerJoin(entries, eq(entries.id, reactions.entryId))
    .where(eq(entries.userId, userId))
    .groupBy(reactions.entryId);
  return new Map(rows.map((r) => [r.entryId, r.n]));
}
