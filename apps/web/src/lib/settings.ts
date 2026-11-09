// Per-user Settings (Phase 5 step 4): AI story help on or off, and the one-time AI notice.
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import type { Db } from "@/lib/db";

export type StorySettings = { aiStoryHelp: boolean; noticeSeen: boolean };

export const AI_OFF_MESSAGE = "AI story help is turned off. You can turn it back on in your account settings.";

/** Whether AI may run for this user. A missing user gets nothing. */
export function storyHelpAllowed(settings: StorySettings | null): boolean {
  return settings?.aiStoryHelp === true;
}

export async function getStorySettings(db: Db, userId: string): Promise<StorySettings | null> {
  const [row] = await db
    .select({ aiStoryHelp: users.aiStoryHelp, noticeSeenAt: users.aiNoticeSeenAt })
    .from(users)
    .where(eq(users.id, userId));
  return row ? { aiStoryHelp: row.aiStoryHelp, noticeSeen: row.noticeSeenAt !== null } : null;
}

export async function setAiStoryHelp(db: Db, userId: string, on: boolean): Promise<void> {
  await db.update(users).set({ aiStoryHelp: on }).where(eq(users.id, userId));
}

export async function markAiNoticeSeen(db: Db, userId: string): Promise<void> {
  await db.update(users).set({ aiNoticeSeenAt: new Date() }).where(eq(users.id, userId));
}
