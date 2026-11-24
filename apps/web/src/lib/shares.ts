// Public share links. Creating, changing and stopping a share is scoped to the entry's owner,
// like entries.ts. getPublicShare is the one deliberately public read: it returns only what
// the share page shows, never the exact location, the score or the owner's email.
import { and, eq, inArray, sql } from "drizzle-orm";
import { entries, shareRecipients, shares, users } from "@/db/schema";
import { parseName } from "@/lib/people-input";
import type { Db } from "@/lib/db";

export const MAX_PLACE_LENGTH = 80;

export type Share = { id: string; entryId: string; place: string | null; timeZone: string };

export type PublicShare = {
  id: string;
  entryId: string;
  ownerId: string;
  ownerName: string | null;
  story: string | null;
  title: string | null;
  caption: string | null;
  takenAt: Date;
  photoWidth: number;
  photoHeight: number;
  place: string | null;
  timeZone: string;
  /** Include my voice, for the normal link. */
  includeVoice: boolean;
};

const shareColumns = { id: shares.id, entryId: shares.entryId, place: shares.place, timeZone: shares.timeZone };

/** 22 base62 characters (about 130 bits), so links can't be guessed. */
export function newShareId(): string {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  // 248 is the largest multiple of 62 below 256; skipping bytes above it keeps every character equally likely.
  let id = "";
  while (id.length < 22) {
    for (const b of crypto.getRandomValues(new Uint8Array(32))) if (b < 248 && id.length < 22) id += alphabet[b % 62];
  }
  return id;
}

/** A time zone the runtime understands, or UTC. */
export function parseTimeZone(value: unknown): string {
  if (typeof value !== "string" || value.length > 64) return "UTC";
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function parsePlace(value: unknown): { ok: true; value: string | null } | { ok: false; error: string } {
  const place = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (place.length > MAX_PLACE_LENGTH) return { ok: false, error: `Keep the place name under ${MAX_PLACE_LENGTH} characters.` };
  return { ok: true, value: place || null };
}

export async function getShareForEntry(db: Db, userId: string, entryId: string): Promise<Share | null> {
  const [row] = await db
    .select(shareColumns)
    .from(shares)
    .where(and(eq(shares.entryId, entryId), eq(shares.userId, userId)));
  return row ?? null;
}

/** Returns the entry's share, creating it if needed; null if the user doesn't own the entry. */
/** Which of the owner's entries are shared right now (the Journal's "Shared" line). */
export async function listSharedEntryIds(db: Db, userId: string): Promise<Set<string>> {
  const rows = await db.select({ entryId: shares.entryId }).from(shares).where(eq(shares.userId, userId));
  return new Set(rows.map((r) => r.entryId));
}

export async function createShare(db: Db, userId: string, entryId: string, timeZone: string): Promise<Share | null> {
  const [owned] = await db
    .select({ id: entries.id, placeName: entries.placeName, timeZone: entries.timeZone })
    .from(entries)
    .where(and(eq(entries.id, entryId), eq(entries.userId, userId)));
  if (!owned) return null;
  // The place friends see starts as the entry's place in words (a town, never the exact point);
  // the owner can change it in Afterglow. The date follows the entry's time zone when it has one.
  await db
    .insert(shares)
    .values({ id: newShareId(), entryId, userId, timeZone: owned.timeZone ?? timeZone, place: owned.placeName })
    .onConflictDoNothing();
  return getShareForEntry(db, userId, entryId);
}

export async function updateSharePlace(db: Db, userId: string, entryId: string, place: string | null): Promise<boolean> {
  const rows = await db
    .update(shares)
    .set({ place })
    .where(and(eq(shares.entryId, entryId), eq(shares.userId, userId)))
    .returning({ id: shares.id });
  return rows.length > 0;
}

/** Deletes the entry's share and returns its id, so the caller can remove cached cards. */
export async function deleteShare(db: Db, userId: string, entryId: string): Promise<string | null> {
  const [row] = await db
    .delete(shares)
    .where(and(eq(shares.entryId, entryId), eq(shares.userId, userId)))
    .returning({ id: shares.id });
  return row?.id ?? null;
}

export async function getPublicShare(db: Db, id: string): Promise<PublicShare | null> {
  const [row] = await db
    .select({
      id: shares.id,
      entryId: shares.entryId,
      ownerId: entries.userId,
      ownerName: users.name,
      story: entries.story,
      title: entries.title,
      caption: entries.caption,
      takenAt: entries.takenAt,
      photoWidth: entries.photoWidth,
      photoHeight: entries.photoHeight,
      place: shares.place,
      includeVoice: shares.includeVoice,
      // One date rule: the entry's time zone, else the one saved when the link was made.
      timeZone: sql<string>`coalesce(${entries.timeZone}, ${shares.timeZone})`,
    })
    .from(shares)
    .innerJoin(entries, eq(entries.id, shares.entryId))
    .innerJoin(users, eq(users.id, entries.userId))
    .where(eq(shares.id, id));
  if (!row) return null;
  return { ...row, ownerName: row.ownerName.trim() || null };
}

/** R2 prefix for a share's generated card images. */
export function shareCardPrefix(shareId: string): string {
  return `shares/${shareId}/`;
}

// Before you share (Phase 4f-3, Build Spec 2.7): who the link is for, and whether it carries the
// owner's voice. Kept free of database code so the browser can build it.
export type ShareChoice = { recipient: string | null; includeVoice: boolean };

/** A personal link's token: 22 base62 characters, like share ids. */
export function parseRecipientToken(value: unknown): string | null {
  return typeof value === "string" && /^[0-9A-Za-z]{22}$/.test(value) ? value : null;
}

/**
 * Applies the choice to the entry's share: for a named person, their personal link (made once per
 * name, its voice switch updated); for "Someone else", the normal link's voice switch. Returns the
 * personal link's token, or null for the normal link. Null share when the owner doesn't own it.
 */
export async function applyShareChoice(
  db: Db,
  userId: string,
  shareId: string,
  choice: ShareChoice,
): Promise<{ token: string | null } | null> {
  const [owned] = await db
    .select({ id: shares.id })
    .from(shares)
    .where(and(eq(shares.id, shareId), eq(shares.userId, userId)));
  if (!owned) return null;
  const name = parseName(choice.recipient);
  if (!name) {
    await db.update(shares).set({ includeVoice: choice.includeVoice }).where(eq(shares.id, shareId));
    return { token: null };
  }
  const sameName = and(eq(shareRecipients.shareId, shareId), sql`lower(${shareRecipients.name}) = lower(${name})`);
  // One personal link per name: insert it, or (already made, or made at the same moment) update it.
  await db
    .insert(shareRecipients)
    .values({ id: crypto.randomUUID(), shareId, name, token: newShareId(), includeVoice: choice.includeVoice })
    .onConflictDoNothing();
  const [row] = await db
    .update(shareRecipients)
    .set({ includeVoice: choice.includeVoice })
    .where(sameName)
    .returning({ token: shareRecipients.token });
  return { token: row.token };
}

export type Recipient = { id: string; name: string; includeVoice: boolean; visitorId: string | null };

/** The personal link behind a token, if it belongs to this share. Public: the share page reads it. */
export async function getRecipient(db: Db, shareId: string, token: string | null): Promise<Recipient | null> {
  if (!token) return null;
  const [row] = await db
    .select({ id: shareRecipients.id, name: shareRecipients.name, includeVoice: shareRecipients.includeVoice, visitorId: shareRecipients.visitorId })
    .from(shareRecipients)
    .where(and(eq(shareRecipients.shareId, shareId), eq(shareRecipients.token, token)));
  return row ?? null;
}

/** Remembers which reaction visitor a personal link became (the first time they react). */
export async function linkRecipientVisitor(db: Db, recipientId: string, visitorId: string): Promise<void> {
  await db
    .update(shareRecipients)
    .set({ visitorId })
    .where(and(eq(shareRecipients.id, recipientId), sql`${shareRecipients.visitorId} is null`));
}

/** The visitors who came through a personal link: their "Wish I was there" reads "I was there!". */
export async function recipientVisitorIds(db: Db, shareId: string): Promise<Set<string>> {
  const rows = await db
    .select({ visitorId: shareRecipients.visitorId })
    .from(shareRecipients)
    .where(eq(shareRecipients.shareId, shareId));
  return new Set(rows.flatMap((r) => (r.visitorId ? [r.visitorId] : [])));
}

/** Whether any link to this share carries the owner's voice (Afterglow's link settings). */
export async function shareVoiceLinks(db: Db, shareId: string): Promise<{ normal: boolean; people: string[] }> {
  const [share] = await db.select({ includeVoice: shares.includeVoice }).from(shares).where(eq(shares.id, shareId));
  const people = await db
    .select({ name: shareRecipients.name })
    .from(shareRecipients)
    .where(and(eq(shareRecipients.shareId, shareId), eq(shareRecipients.includeVoice, true)))
    .orderBy(shareRecipients.createdAt);
  return { normal: share?.includeVoice ?? false, people: people.map((p) => p.name) };
}

/** Turns the owner's voice off on every link to this entry's share. */
export async function stopSharingVoice(db: Db, userId: string, entryId: string): Promise<boolean> {
  const [share] = await db
    .update(shares)
    .set({ includeVoice: false })
    .where(and(eq(shares.entryId, entryId), eq(shares.userId, userId)))
    .returning({ id: shares.id });
  if (!share) return false;
  await db.update(shareRecipients).set({ includeVoice: false }).where(eq(shareRecipients.shareId, share.id));
  return true;
}

/** Turns the owner's voice off on every link to every sunset ("Delete all recordings"). */
export async function stopSharingAllVoices(db: Db, userId: string): Promise<void> {
  const owned = await db.update(shares).set({ includeVoice: false }).where(eq(shares.userId, userId)).returning({ id: shares.id });
  if (owned.length) await db.update(shareRecipients).set({ includeVoice: false }).where(inArray(shareRecipients.shareId, owned.map((s) => s.id)));
}
