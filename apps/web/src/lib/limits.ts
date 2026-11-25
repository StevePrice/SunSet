// Upload caps per person per rolling 24 hours (Phase 7a). Far above real use (a few sunsets a day,
// a handful of recordings each); they stop a broken page or a misused account from filling storage.
// Scoring (DAILY_SCORING_LIMIT) and story AI (DAILY_AI_LIMIT) have their own caps.
import { and, count, eq, gt } from "drizzle-orm";
import { entries, storyClips } from "@/db/schema";
import type { Db } from "@/lib/db";

export const DAILY_ENTRY_LIMIT = 30;
export const DAILY_CLIP_LIMIT = 60;

export const ENTRY_LIMIT_MESSAGE = `You've saved ${DAILY_ENTRY_LIMIT} sunsets today, the most for one day. You can save more tomorrow.`;
export const CLIP_LIMIT_MESSAGE = `You've made ${DAILY_CLIP_LIMIT} recordings today, the most for one day. You can type your story instead, or record more tomorrow.`;

const dayAgo = () => new Date(Date.now() - 24 * 60 * 60 * 1000);

export async function entriesToday(db: Db, userId: string): Promise<number> {
  const [row] = await db.select({ n: count() }).from(entries).where(and(eq(entries.userId, userId), gt(entries.createdAt, dayAgo())));
  return row?.n ?? 0;
}

export async function clipsToday(db: Db, userId: string): Promise<number> {
  const [row] = await db.select({ n: count() }).from(storyClips).where(and(eq(storyClips.userId, userId), gt(storyClips.createdAt, dayAgo())));
  return row?.n ?? 0;
}
