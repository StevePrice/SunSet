"use server";

// AI Story Capture. Every answer is saved before any AI call, and every AI failure falls back to
// something usable (fixed questions, or the user's own words), so no story is ever lost to the AI.
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle, type Db } from "@/lib/db";
import { photoKey } from "@/lib/entries";
import { getScore } from "@/lib/scores";
import { followUp, openingQuestions, writeStory, type Usage } from "@/lib/story/ai";
import { FALLBACK_OPENERS, MAX_FOLLOW_UPS, STORY_STYLES, originalWords, type StoryStyle } from "@/lib/story/prompts";
import {
  addTurn,
  aiCallsToday,
  DAILY_AI_LIMIT,
  ensureSession,
  finishStory,
  MAX_ANSWER_LENGTH,
  MAX_CAPTION_LENGTH,
  MAX_TITLE_LENGTH,
  parseFinalStory,
  parseStoryText,
  recordAiCall,
  saveDraft,
  setNextQuestion,
  setOpeners,
  toView,
  type StorySession,
  type StoryView,
} from "@/lib/story/sessions";

export type StoryResult = { view: StoryView; error?: string };
export type DraftResult = { text: string; title: string | null; caption: string | null; stale: boolean; error?: string };

const LIMIT_MESSAGE = "You've reached today's limit for story help. You can still type your story and save it.";

async function signedIn() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

async function photo(userId: string, entryId: string, variant: "display" | "thumb"): Promise<ArrayBuffer | null> {
  const { env } = await getCloudflareContext({ async: true });
  const object = await env.PHOTOS.get(photoKey(userId, entryId, variant));
  return object ? object.arrayBuffer() : null;
}

/** Runs an AI call within the user's daily limit and records it. Returns null if limited or failed. */
async function withAi<T extends { usage: Usage }>(
  db: Db,
  userId: string,
  kind: string,
  call: () => Promise<T>,
): Promise<T | "limited" | null> {
  if ((await aiCallsToday(db, userId)) >= DAILY_AI_LIMIT) return "limited";
  const started = Date.now();
  try {
    const result = await call();
    console.log(`Story AI ${kind}: ${Date.now() - started} ms, ${result.usage.inputTokens} in / ${result.usage.outputTokens} out`);
    await recordAiCall(db, userId, kind, result.usage);
    return result;
  } catch (error) {
    console.error(`Story AI ${kind} failed after ${Date.now() - started} ms:`, error);
    await recordAiCall(db, userId, kind, null);
    return null;
  }
}

async function aiEnv() {
  const { env } = await getCloudflareContext({ async: true });
  return { ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY, STORY_MODEL: env.STORY_MODEL };
}

async function nextFollowUp(db: Db, userId: string, session: StorySession): Promise<{ session: StorySession; error?: string }> {
  if (session.turns.length - 1 >= MAX_FOLLOW_UPS) {
    return { session: await setNextQuestion(db, session, { question: null, wrapUp: true, sensitive: false, safetyConcern: false }) };
  }
  const env = await aiEnv();
  const result = await withAi(db, userId, "follow_up", () => followUp(env, session.turns, session.asked));
  if (!result || result === "limited") {
    return {
      session: await setNextQuestion(db, session, { question: null, wrapUp: true, sensitive: false, safetyConcern: false }),
      error: result === "limited" ? LIMIT_MESSAGE : "I couldn't think of another question just now. You can add more yourself, or see your story.",
    };
  }
  return {
    session: await setNextQuestion(db, session, {
      question: result.question,
      wrapUp: result.story_feels_complete,
      sensitive: result.sensitive,
      safetyConcern: result.safety_concern,
    }),
  };
}

/** Three opening questions for the photo; `more` replaces them with three new ones. */
export async function openersAction(entryId: string, more: boolean): Promise<StoryResult> {
  const user = await signedIn();
  return withDrizzle(async (db) => {
    let session = await ensureSession(db, user.id, entryId);
    if (!session) redirect("/journal");
    if (session.openers.length && !more) return { view: toView(session) };

    const [env, thumb] = await Promise.all([aiEnv(), photo(user.id, entryId, "thumb")]);
    const result = thumb ? await withAi(db, user.id, "openers", () => openingQuestions(env, thumb, session!.asked)) : null;
    if (result && result !== "limited") {
      session = await setOpeners(db, session, result.questions);
      return { view: toView(session) };
    }
    const unused = FALLBACK_OPENERS.filter((q) => !session!.openers.includes(q));
    session = await setOpeners(db, session, unused.length ? FALLBACK_OPENERS : session.openers);
    return { view: toView(session), ...(result === "limited" && { error: LIMIT_MESSAGE }) };
  });
}

/** Saves an answer, then asks the next follow-up (unless `followUp` is false, e.g. "Add more"). */
export async function answerAction(entryId: string, question: string | null, answer: string, askNext = true): Promise<StoryResult> {
  const user = await signedIn();
  const text = parseStoryText(answer, MAX_ANSWER_LENGTH);
  return withDrizzle(async (db) => {
    let session = await ensureSession(db, user.id, entryId);
    if (!session) redirect("/journal");
    if (!text) return { view: toView(session), error: "Say or type something first." };
    session = await addTurn(db, session, { question, answer: text, via: "typed" });
    if (!askNext) return { view: toView(session) };
    const next = await nextFollowUp(db, user.id, session);
    return { view: toView(next.session), error: next.error };
  });
}

/** "Ask me something else" for the current follow-up. */
export async function otherQuestionAction(entryId: string): Promise<StoryResult> {
  const user = await signedIn();
  return withDrizzle(async (db) => {
    const session = await ensureSession(db, user.id, entryId);
    if (!session) redirect("/journal");
    if (!session.turns.length) return openersAction(entryId, true);
    const next = await nextFollowUp(db, user.id, session);
    return { view: toView(next.session), error: next.error };
  });
}

/** A written version of the story, generated the first time it's viewed and saved after that. */
export async function draftAction(entryId: string, style: StoryStyle, rewrite = false): Promise<DraftResult> {
  const user = await signedIn();
  if (!STORY_STYLES.includes(style)) throw new Error("Unknown story style.");
  return withDrizzle(async (db) => {
    let session = await ensureSession(db, user.id, entryId);
    if (!session) redirect("/journal");
    const existing = session.drafts[style];
    const fresh = existing && existing.turns === session.turns.length;
    if (existing && (fresh || (existing.edited && !rewrite))) {
      return { text: existing.text, title: session.title, caption: session.caption, stale: !fresh };
    }
    if (!session.turns.length) return { text: "", title: session.title, caption: session.caption, stale: false };

    const [env, image, score] = await Promise.all([
      aiEnv(),
      style === "crafted-photo" ? photo(user.id, entryId, "display") : null,
      style === "crafted-photo" ? getScore(db, user.id, entryId) : null,
    ]);
    const detected = score?.status === "done" ? score.phenomena.map((p) => `${p.kind.replace(/_/g, " ")} (${p.description})`) : [];
    const turns = session.turns;
    const result = await withAi(db, user.id, `story_${style}`, () => writeStory(env, style, turns, image, detected));
    if (!result || result === "limited") {
      // The user's own words are always a usable story.
      return {
        text: existing?.text ?? originalWords(turns),
        title: session.title,
        caption: session.caption,
        stale: false,
        error: result === "limited" ? LIMIT_MESSAGE : "I couldn't write this version just now. Here are your own words; you can edit them or try again.",
      };
    }
    session = await saveDraft(db, session, style, { text: result.story, turns: turns.length, edited: false }, result);
    return { text: result.story, title: session.title, caption: session.caption, stale: false };
  });
}

/** Saves the chosen version to the Journal entry. */
export async function saveStoryAction(entryId: string, style: StoryStyle, form: FormData): Promise<{ error: string } | void> {
  const user = await signedIn();
  if (!STORY_STYLES.includes(style)) throw new Error("Unknown story style.");
  const text = parseFinalStory(form.get("story"));
  if (!text) return { error: "Your story is empty." };
  const title = parseStoryText(form.get("title"), MAX_TITLE_LENGTH);
  const caption = parseStoryText(form.get("caption"), MAX_CAPTION_LENGTH);
  const saved = await withDrizzle(async (db) => {
    const session = await ensureSession(db, user.id, entryId);
    if (!session) return false;
    await finishStory(db, session, { style, text, title, caption });
    return true;
  });
  if (!saved) return { error: "This entry no longer exists." };
  revalidatePath("/journal");
  revalidatePath(`/journal/${entryId}`);
  redirect(`/journal/${entryId}`);
}
