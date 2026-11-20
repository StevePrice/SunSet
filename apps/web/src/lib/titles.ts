// Every entry has a title (Phase 4e, Build Spec 2.6). Entries saved without one get an
// AI-suggested title: from the story when there is one (only after the person has seen the AI
// notice, since it sends their words), otherwise from the photo, which scoring already sends to
// the AI. Respects AI story help being off and the daily AI limit, like every story AI call.
import { and, eq, isNull } from "drizzle-orm";
import { entries } from "@/db/schema";
import type { Db } from "@/lib/db";
import { getEntry, photoKey } from "@/lib/entries";
import { getStorySettings } from "@/lib/settings";
import { suggestTitle, suggestTitleFromPhoto, type AiEnv } from "@/lib/story/ai";
import { withAi } from "@/lib/story/ai-guard";
import { MAX_TITLE_LENGTH } from "@/lib/story/sessions";

type Env = AiEnv & { PHOTOS: R2Bucket };

/** Suggests and saves a title for an entry that has none. Returns the title, or null. */
export async function fillMissingTitle(db: Db, env: Env, userId: string, entryId: string): Promise<string | null> {
  const entry = await getEntry(db, userId, entryId);
  if (!entry || entry.title) return entry?.title ?? null;
  const settings = await getStorySettings(db, userId);
  const story = entry.story?.trim();

  let result;
  if (story && settings?.noticeSeen) {
    result = await withAi(db, userId, "title", () => suggestTitle(env, story));
  } else {
    const object = await env.PHOTOS.get(photoKey(userId, entryId, "thumb"));
    if (!object) return null;
    const photo = await object.arrayBuffer();
    result = await withAi(db, userId, "title_photo", () => suggestTitleFromPhoto(env, photo));
  }
  if (!result || result === "off" || result === "limited") return null;

  const title = result.title.slice(0, MAX_TITLE_LENGTH);
  // Only if it still has no title: the person may have typed one meanwhile.
  const saved = await db
    .update(entries)
    .set({ title })
    .where(and(eq(entries.id, entryId), eq(entries.userId, userId), isNull(entries.title)))
    .returning({ id: entries.id });
  return saved.length ? title : null;
}

/** Entries without a title, oldest first, for the admin backfill. */
export async function untitledEntries(db: Db, limit: number): Promise<{ id: string; userId: string }[]> {
  return db
    .select({ id: entries.id, userId: entries.userId })
    .from(entries)
    .where(isNull(entries.title))
    .orderBy(entries.createdAt)
    .limit(limit);
}
