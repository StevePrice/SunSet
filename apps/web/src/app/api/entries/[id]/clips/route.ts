import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { getEntry } from "@/lib/entries";
import { AI_OFF_MESSAGE, getStorySettings, storyHelpAllowed } from "@/lib/settings";
import { withAi } from "@/lib/story/ai-guard";
import { clipKey, createClip, setClipTranscript } from "@/lib/story/clips";
import { transcribe } from "@/lib/story/transcribe";
import { checkClip, MAX_CLIP_BYTES } from "@/lib/story/voice";

const fail = (error: string, status = 400) => Response.json({ error }, { status });

// Saves one voice answer and transcribes it. The clip is stored before Whisper runs, so a
// transcription failure never loses the recording: the reply then carries the clip's ID and
// `transcribeError`, and the user can retry (re-transcribing the stored clip) or type instead.
export async function POST(request: Request, ctx: RouteContext<"/api/entries/[id]/clips">) {
  const { id: entryId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return fail("Please sign in.", 401);
  // The form adds a little to the clip; refuse anything clearly too big before reading it.
  if (Number(request.headers.get("content-length") ?? 0) > MAX_CLIP_BYTES + 64 * 1024) return fail("That recording is too long.", 413);

  const allowed = await withDrizzle(async (db) => {
    if (!(await getEntry(db, user.id, entryId))) return "missing";
    return storyHelpAllowed(await getStorySettings(db, user.id)) ? "ok" : "off";
  });
  if (allowed === "missing") return fail("This entry no longer exists.", 404);
  // Voice answers exist to be transcribed, which is AI; with AI story help off there are none.
  if (allowed === "off") return fail(AI_OFF_MESSAGE, 403);

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob)) return fail("A recording is required.");
  const check = checkClip({ size: audio.size, type: audio.type, durationMs: form?.get("durationMs") });
  if (!check.ok) return fail(check.error);

  const { env } = await getCloudflareContext({ async: true });
  const clipId = crypto.randomUUID();
  const key = clipKey(user.id, entryId, clipId, check.extension);
  const bytes = await audio.arrayBuffer();
  await env.PHOTOS.put(key, bytes, { httpMetadata: { contentType: check.contentType } });
  const clip = await withDrizzle((db) =>
    createClip(db, user.id, entryId, {
      id: clipId,
      r2Key: key,
      contentType: check.contentType,
      durationMs: check.durationMs,
      sizeBytes: audio.size,
    }),
  ).catch(async (error) => {
    await env.PHOTOS.delete(key);
    throw error;
  });
  if (!clip) {
    await env.PHOTOS.delete(key);
    return fail("This entry no longer exists.", 404);
  }

  const result = await withDrizzle(async (db) => {
    const transcribed = await withAi(db, user.id, "transcribe", () => transcribe(env.AI, bytes));
    if (transcribed && transcribed !== "off" && transcribed !== "limited") await setClipTranscript(db, user.id, clipId, transcribed.text);
    return transcribed;
  });
  if (!result || result === "off" || result === "limited") {
    return Response.json({ clipId, transcribeError: result ?? "failed" }, { status: 201 });
  }
  return Response.json({ clipId, transcript: result.text }, { status: 201 });
}
