// Public share links. Creating, changing and stopping a share is scoped to the entry's owner,
// like entries.ts. getPublicShare is the one deliberately public read: it returns only what
// the share page shows, never the exact location or the owner's email.
import { and, eq } from "drizzle-orm";
import { entries, shares, users } from "@/db/schema";
import type { Db } from "@/lib/db";
import { getSharedScore, type EntryScore } from "@/lib/scores";

export const MAX_PLACE_LENGTH = 80;

export type Share = { id: string; entryId: string; place: string | null; timeZone: string };

export type PublicShare = {
  id: string;
  entryId: string;
  ownerId: string;
  ownerName: string | null;
  story: string | null;
  takenAt: Date;
  photoWidth: number;
  photoHeight: number;
  place: string | null;
  timeZone: string;
  score: EntryScore | null;
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
export async function createShare(db: Db, userId: string, entryId: string, timeZone: string): Promise<Share | null> {
  const [owned] = await db
    .select({ id: entries.id })
    .from(entries)
    .where(and(eq(entries.id, entryId), eq(entries.userId, userId)));
  if (!owned) return null;
  await db.insert(shares).values({ id: newShareId(), entryId, userId, timeZone }).onConflictDoNothing();
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
      takenAt: entries.takenAt,
      photoWidth: entries.photoWidth,
      photoHeight: entries.photoHeight,
      place: shares.place,
      timeZone: shares.timeZone,
    })
    .from(shares)
    .innerJoin(entries, eq(entries.id, shares.entryId))
    .innerJoin(users, eq(users.id, entries.userId))
    .where(eq(shares.id, id));
  if (!row) return null;
  return { ...row, ownerName: row.ownerName.trim() || null, score: await getSharedScore(db, row.entryId) };
}

/** R2 prefix for a share's generated card images. */
export function shareCardPrefix(shareId: string): string {
  return `shares/${shareId}/`;
}
