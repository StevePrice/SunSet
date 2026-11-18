// Story interview state. Like entries.ts, every function is scoped to the entry's owner.
import { and, count, eq, gt } from "drizzle-orm";
import { aiCalls, entries, storySessions, type StoryDraft, type StorySaid, type StoryTurn } from "@/db/schema";
import type { Db } from "@/lib/db";
import { MAX_STORY_LENGTH } from "@/lib/entry-input";
import { MAX_FOLLOW_UPS, type StoryStyle } from "./prompts";

/** AI calls per user per rolling 24 hours, to bound spend. A full session uses about ten. */
export const DAILY_AI_LIMIT = 150;
export const MAX_ANSWER_LENGTH = 4000;
export const MAX_TITLE_LENGTH = 80;
export const MAX_CAPTION_LENGTH = 200;

export type StorySession = typeof storySessions.$inferSelect;

/** What the interview screen needs. */
export type StoryView = {
  openers: string[];
  turns: StoryTurn[];
  nextQuestion: string | null;
  followUpsLeft: number;
  wrapUp: boolean;
  sensitive: boolean;
  safetyConcern: boolean;
};

export function toView(session: StorySession | null): StoryView {
  const turns = session?.turns ?? [];
  return {
    openers: session?.openers ?? [],
    turns,
    nextQuestion: session?.nextQuestion ?? null,
    followUpsLeft: Math.max(0, MAX_FOLLOW_UPS - Math.max(0, turns.length - 1)),
    wrapUp: session?.wrapUp ?? false,
    sensitive: session?.sensitive ?? false,
    safetyConcern: session?.safetyConcern ?? false,
  };
}

export async function getSession(db: Db, userId: string, entryId: string): Promise<StorySession | null> {
  const [row] = await db
    .select()
    .from(storySessions)
    .where(and(eq(storySessions.entryId, entryId), eq(storySessions.userId, userId)));
  return row ?? null;
}

/** The session, created on first use; null if the user doesn't own the entry. */
export async function ensureSession(db: Db, userId: string, entryId: string): Promise<StorySession | null> {
  const [owned] = await db
    .select({ id: entries.id })
    .from(entries)
    .where(and(eq(entries.id, entryId), eq(entries.userId, userId)));
  if (!owned) return null;
  await db.insert(storySessions).values({ entryId, userId }).onConflictDoNothing();
  return getSession(db, userId, entryId);
}

async function update(db: Db, session: StorySession, changes: Partial<StorySession>): Promise<StorySession> {
  const [row] = await db
    .update(storySessions)
    .set(changes)
    .where(and(eq(storySessions.entryId, session.entryId), eq(storySessions.userId, session.userId)))
    .returning();
  return row;
}

export function setOpeners(db: Db, session: StorySession, openers: string[]) {
  return update(db, session, { openers, asked: [...session.asked, ...openers] });
}

export function addTurn(db: Db, session: StorySession, turn: StoryTurn) {
  return update(db, session, { turns: [...session.turns, turn], nextQuestion: null, wrapUp: false });
}

export function setNextQuestion(
  db: Db,
  session: StorySession,
  next: { question: string | null; wrapUp: boolean; sensitive: boolean; safetyConcern: boolean },
) {
  return update(db, session, {
    nextQuestion: next.question,
    asked: next.question ? [...session.asked, next.question] : session.asked,
    wrapUp: next.wrapUp,
    // Once a story is sensitive it stays that way for the session.
    sensitive: session.sensitive || next.sensitive,
    safetyConcern: session.safetyConcern || next.safetyConcern,
  });
}

export function saveDraft(
  db: Db,
  session: StorySession,
  style: StoryStyle,
  draft: StoryDraft,
  suggested?: { title: string; caption: string },
) {
  return update(db, session, {
    drafts: { ...session.drafts, [style]: draft },
    // Keep the first suggestion, so switching styles doesn't keep changing the title.
    title: session.title ?? suggested?.title?.slice(0, MAX_TITLE_LENGTH) ?? null,
    caption: session.caption ?? suggested?.caption?.slice(0, MAX_CAPTION_LENGTH) ?? null,
  });
}

export function saveSaid(db: Db, session: StorySession, said: StorySaid) {
  return update(db, session, { said });
}

/** Puts the chosen story on the entry, where the Journal and share page read it. */
export async function finishStory(
  db: Db,
  session: StorySession,
  chosen: { style: StoryStyle; text: string; title: string | null; caption: string | null },
): Promise<void> {
  const previous = session.drafts[chosen.style];
  const edited = previous ? previous.edited || previous.text !== chosen.text : true;
  await update(db, session, {
    drafts: { ...session.drafts, [chosen.style]: { text: chosen.text, turns: previous?.turns ?? session.turns.length, edited } },
    title: chosen.title,
    caption: chosen.caption,
  });
  await db
    .update(entries)
    .set({ story: chosen.text, title: chosen.title, caption: chosen.caption })
    .where(and(eq(entries.id, session.entryId), eq(entries.userId, session.userId)));
}

export function parseStoryText(value: unknown, max: number): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text.slice(0, max) : null;
}

export const parseFinalStory = (value: unknown) => parseStoryText(value, MAX_STORY_LENGTH);

export async function aiCallsToday(db: Db, userId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({ n: count() })
    .from(aiCalls)
    .where(and(eq(aiCalls.userId, userId), gt(aiCalls.createdAt, since)));
  return row?.n ?? 0;
}

export async function recordAiCall(
  db: Db,
  userId: string,
  kind: string,
  usage: { inputTokens: number; outputTokens: number } | null,
): Promise<void> {
  await db.insert(aiCalls).values({
    id: crypto.randomUUID(),
    userId,
    kind,
    inputTokens: usage?.inputTokens ?? null,
    outputTokens: usage?.outputTokens ?? null,
  });
}
