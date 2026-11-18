"use server";

// AI Story Capture. Every answer is saved before any AI call, and every AI failure falls back to
// something usable (fixed questions, or the user's own words), so no story is ever lost to the AI.
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { transcribe } from "@/lib/story/transcribe";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle, type Db } from "@/lib/db";
import { photoKey } from "@/lib/entries";
import { getScore } from "@/lib/scores";
import { AI_OFF_MESSAGE, markAiNoticeSeen, setAiStoryHelp } from "@/lib/settings";
import { cleanTranscripts, followUp, openingQuestions, writeStory } from "@/lib/story/ai";
import { withAi } from "@/lib/story/ai-guard";
import { clipsForAnswer, getClip, setClipTranscript } from "@/lib/story/clips";
import { assembleSaid, FALLBACK_OPENERS, MAX_FOLLOW_UPS, STORY_STYLES, originalWords, type StoryStyle } from "@/lib/story/prompts";
import {
  addTurn,
  ensureSession,
  getSession,
  finishStory,
  MAX_ANSWER_LENGTH,
  MAX_CAPTION_LENGTH,
  MAX_TITLE_LENGTH,
  parseFinalStory,
  parseStoryText,
  saveDraft,
  saveSaid,
  setNextQuestion,
  setOpeners,
  toView,
  type StorySession,
  type StoryView,
} from "@/lib/story/sessions";

export type StoryResult = { view: StoryView; error?: string };
export type DraftResult = { text: string; title: string | null; caption: string | null; stale: boolean; error?: string };

const LIMIT_MESSAGE = "You've reached today's limit for story help. You can still type your story and save it.";
const TRANSCRIBE_FAILED = "We couldn't turn that into text.";

/** The message for an AI call that didn't run, or `failed` when it ran and failed. */
function aiMessage(result: "off" | "limited" | null, failed: string): string {
  return result === "off" ? AI_OFF_MESSAGE : result === "limited" ? LIMIT_MESSAGE : failed;
}

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
  if (!result || result === "off" || result === "limited") {
    return {
      session: await setNextQuestion(db, session, { question: null, wrapUp: true, sensitive: false, safetyConcern: false }),
      error: aiMessage(result, "I couldn't think of another question just now. You can add more yourself, or see your story."),
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
    if (result && result !== "off" && result !== "limited") {
      session = await setOpeners(db, session, result.questions);
      return { view: toView(session) };
    }
    const unused = FALLBACK_OPENERS.filter((q) => !session!.openers.includes(q));
    session = await setOpeners(db, session, unused.length ? FALLBACK_OPENERS : session.openers);
    return { view: toView(session), ...((result === "off" || result === "limited") && { error: aiMessage(result, "") }) };
  });
}

/**
 * Saves an answer, then asks the next follow-up (unless `askNext` is false, e.g. "Add more").
 * `clipIds` are the recordings made for this answer; it counts as spoken if one was transcribed.
 */
export async function answerAction(
  entryId: string,
  question: string | null,
  answer: string,
  askNext = true,
  clipIds: string[] = [],
): Promise<StoryResult> {
  const user = await signedIn();
  const text = parseStoryText(answer, MAX_ANSWER_LENGTH);
  return withDrizzle(async (db) => {
    let session = await ensureSession(db, user.id, entryId);
    if (!session) redirect("/journal");
    if (!text) return { view: toView(session), error: "Say or type something first." };
    const clips = await clipsForAnswer(db, user.id, entryId, clipIds.slice(0, 20));
    const spoken = clips.some((c) => c.transcript !== null);
    session = await addTurn(db, session, {
      question,
      answer: text,
      via: spoken ? "spoken" : "typed",
      ...(clips.length && { clipIds: clips.map((c) => c.id) }),
    });
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
    // The scorer's Wow reason, so the story and the score feel connected (Story Capture PRD 6.6).
    const detected = score?.status === "done" && score.wowReason ? [score.wowReason] : [];
    const turns = session.turns;
    const result = await withAi(db, user.id, `story_${style}`, () => writeStory(env, style, turns, image, detected));
    if (!result || result === "off" || result === "limited") {
      // The user's own words are always a usable story.
      return {
        text: existing?.text ?? originalWords(turns),
        title: session.title,
        caption: session.caption,
        stale: false,
        error: aiMessage(result, "I couldn't write this version just now. Here are your own words; you can edit them or try again."),
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

/** Retry for a clip whose transcription failed: transcribes the stored clip again, no re-recording. */
export async function retryTranscriptionAction(entryId: string, clipId: string): Promise<{ transcript: string } | { error: string }> {
  const user = await signedIn();
  const { env } = await getCloudflareContext({ async: true });
  return withDrizzle(async (db) => {
    const clip = await getClip(db, user.id, clipId);
    if (!clip || clip.entryId !== entryId) return { error: "That recording no longer exists." };
    if (clip.transcript) return { transcript: clip.transcript };
    const object = await env.PHOTOS.get(clip.r2Key);
    if (!object) return { error: "That recording no longer exists." };
    const audio = await object.arrayBuffer();
    const result = await withAi(db, user.id, "transcribe", () => transcribe(env.AI, audio));
    if (!result || result === "off" || result === "limited") return { error: aiMessage(result, TRANSCRIBE_FAILED) };
    await setClipTranscript(db, user.id, clip.id, result.text);
    return { transcript: result.text };
  });
}

/**
 * "What you said" for Entry Detail: made once from the spoken answers and saved; made again only
 * after more answers are added. If the AI isn't available, the raw words are returned unsaved.
 */
export async function saidAction(entryId: string): Promise<{ text: string } | null> {
  const user = await signedIn();
  return withDrizzle(async (db) => {
    const session = await getSession(db, user.id, entryId);
    if (!session?.turns.length) return null;
    if (session.said && session.said.turns === session.turns.length) return { text: session.said.text };
    const turns = session.turns;
    const spoken = turns.filter((t) => t.via === "spoken").map((t) => t.answer);
    if (!spoken.length) return { text: originalWords(turns) };
    const env = await aiEnv();
    const result = await withAi(db, user.id, "said", () => cleanTranscripts(env, spoken));
    if (!result || result === "off" || result === "limited") return { text: assembleSaid(turns, null) };
    const text = assembleSaid(turns, result.answers);
    await saveSaid(db, session, { text, turns: turns.length });
    return { text };
  });
}

/** The first-use notice: "Continue" records that it was seen. */
export async function acceptAiNoticeAction(): Promise<void> {
  const user = await signedIn();
  await withDrizzle((db) => markAiNoticeSeen(db, user.id));
}

/** The first-use notice: "Turn off AI help". */
export async function declineAiNoticeAction(entryId: string): Promise<void> {
  const user = await signedIn();
  await withDrizzle(async (db) => {
    await markAiNoticeSeen(db, user.id);
    await setAiStoryHelp(db, user.id, false);
  });
  revalidatePath("/account");
  redirect(`/journal/${entryId}`);
}
