"use server";

// AI Story Capture. Every answer is saved before any AI call, and every AI failure falls back to
// something usable (fixed questions, or the user's own words), so no story is ever lost to the AI.
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { transcribe } from "@/lib/story/transcribe";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { entryFacts, track, wordBucket } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { getEntry, photoKey, updateEntry } from "@/lib/entries";
import { parseStory } from "@/lib/entry-input";
import { getScore } from "@/lib/scores";
import { AI_OFF_MESSAGE, getStorySettings, markAiNoticeSeen, setAiStoryHelp } from "@/lib/settings";
import { cleanTranscripts, openingQuestions, suggestTitle, writeStory } from "@/lib/story/ai";
import { withAi } from "@/lib/story/ai-guard";
import { clipsForAnswer, getClip, setClipTranscript } from "@/lib/story/clips";
import { acceptCleaned, FALLBACK_OPENERS, STORY_STYLES, type StoryStyle } from "@/lib/story/prompts";
import {
  addTurn,
  ensureSession,
  MAX_ANSWER_LENGTH,
  MAX_TITLE_LENGTH,
  parseStoryText,
  setOpeners,
  toView,
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
 * Keeps one answer: a spoken one with its recordings, for "What you said" and playback. `question`
 * is the story idea shown above the box, if any. It counts as spoken if a clip was transcribed.
 */
export async function answerAction(entryId: string, question: string | null, answer: string, clipIds: string[] = []): Promise<StoryResult> {
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
    return { view: toView(session) };
  });
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

/** The first-use notice: "Continue" records that it was seen. */
export async function acceptAiNoticeAction(): Promise<void> {
  const user = await signedIn();
  await withDrizzle((db) => markAiNoticeSeen(db, user.id));
}

/** The first-use notice: "Turn off AI help". The story screen stays open, for typing. */
export async function declineAiNoticeAction(): Promise<void> {
  const user = await signedIn();
  await withDrizzle(async (db) => {
    await markAiNoticeSeen(db, user.id);
    await setAiStoryHelp(db, user.id, false);
  });
  revalidatePath("/account");
}

// The story screen (Phase 4e, Build Spec 3.7–3.9): typing first, speaking right below, and the AI
// only when asked. The person's words in the box are what gets saved; these actions help with them.

/** A new transcript with filler words removed ("What you said"), or the raw words if that fails. */
export async function tidyAction(entryId: string, transcript: string): Promise<{ text: string }> {
  const user = await signedIn();
  const raw = parseStoryText(transcript, MAX_ANSWER_LENGTH) ?? "";
  if (!raw) return { text: "" };
  return withDrizzle(async (db) => {
    if (!(await getEntry(db, user.id, entryId))) return { text: raw };
    const env = await aiEnv();
    const result = await withAi(db, user.id, "said", () => cleanTranscripts(env, [raw]));
    if (!result || result === "off" || result === "limited") return { text: raw };
    const cleaned = result.answers[0]?.trim() ?? "";
    return { text: cleaned && acceptCleaned(raw, cleaned) ? cleaned : raw };
  });
}

/** A suggested title from the words in the box. */
export async function suggestTitleAction(entryId: string, story: string): Promise<{ title: string } | { error: string }> {
  const user = await signedIn();
  const text = parseStoryText(story, MAX_ANSWER_LENGTH);
  if (!text) return { error: "Add your story first." };
  return withDrizzle(async (db) => {
    if (!(await getEntry(db, user.id, entryId))) return { error: "This entry no longer exists." };
    const env = await aiEnv();
    const result = await withAi(db, user.id, "title", () => suggestTitle(env, text));
    if (!result || result === "off" || result === "limited") return { error: aiMessage(result, "Story help isn't available right now. Your words are saved.") };
    return { title: result.title.slice(0, MAX_TITLE_LENGTH) };
  });
}

/**
 * "Help me polish it": My story (three lengths) or Crafted story, written from the words in the box.
 * If the AI isn't available, the person's own words come back with a message.
 */
export async function polishAction(entryId: string, style: StoryStyle, story: string): Promise<{ text: string; title: string | null; error?: string }> {
  const user = await signedIn();
  if (!STORY_STYLES.includes(style)) throw new Error("Unknown story style.");
  const text = parseStoryText(story, MAX_ANSWER_LENGTH);
  if (!text) return { text: "", title: null, error: "Add your story first." };
  return withDrizzle(async (db) => {
    if (!(await getEntry(db, user.id, entryId))) return { text, title: null, error: "This entry no longer exists." };
    const [env, image, score] = await Promise.all([
      aiEnv(),
      style === "crafted-photo" ? photo(user.id, entryId, "display") : null,
      style === "crafted-photo" ? getScore(db, user.id, entryId) : null,
    ]);
    const detected = score?.status === "done" && score.wowReason ? [score.wowReason] : [];
    const turns = [{ question: null, answer: text, via: "typed" as const }];
    const result = await withAi(db, user.id, `story_${style}`, () => writeStory(env, style, turns, image, detected));
    if (!result || result === "off" || result === "limited") {
      return { text, title: null, error: aiMessage(result, "Story help isn't available right now. Your words are saved.") };
    }
    await track("story_polished", user.id, { entry_id: entryId, style });
    return { text: result.story, title: result.title.slice(0, MAX_TITLE_LENGTH) || null };
  });
}

/**
 * Save on the story screen: the words in the box become the entry's story (an empty box leaves no
 * story), with the title. The old sharing caption is cleared, so share cards use the story. A typed
 * story is kept once as "What you wrote". With no title, one is suggested (best effort, and only
 * after the first-use notice).
 */
export async function saveStoryTextAction(
  entryId: string,
  input: { story: string; title: string; removeLocation?: boolean },
): Promise<{ error: string } | void> {
  const user = await signedIn();
  const story = parseStory(input.story);
  if (!story.ok) return { error: story.error };
  let title = parseStoryText(input.title, MAX_TITLE_LENGTH);
  const saved = await withDrizzle(async (db) => {
    const entry = await getEntry(db, user.id, entryId);
    if (!entry) return false;
    if (story.value) {
      const session = await ensureSession(db, user.id, entryId);
      if (session && !session.turns.length) await addTurn(db, session, { question: null, answer: story.value, via: "typed" });
      // Only once the person has seen the first-use notice, so no words go to the AI unannounced.
      if (!title && !entry.title && (await getStorySettings(db, user.id))?.noticeSeen) {
        const env = await aiEnv();
        const result = await withAi(db, user.id, "title", () => suggestTitle(env, story.value!));
        if (result && result !== "off" && result !== "limited") title = result.title.slice(0, MAX_TITLE_LENGTH);
      }
    }
    const updated = await updateEntry(db, user.id, entryId, {
      story: story.value,
      title: title ?? entry.title,
      caption: null,
      ...(input.removeLocation && { location: null }),
    });
    if (updated && story.value) {
      await track("story_saved", user.id, {
        ...(await entryFacts(db, entryId)),
        first_story: !entry.story?.trim(),
        words: wordBucket(story.value),
      });
    }
    return updated;
  });
  if (!saved) return { error: "This entry no longer exists." };
  revalidatePath("/journal");
  revalidatePath(`/journal/${entryId}`);
  redirect(`/journal/${entryId}`);
}
