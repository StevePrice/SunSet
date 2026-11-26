import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cookies } from "next/headers";
import { MAX_ADDITION_SECONDS } from "@/lib/addition-input";
import { planAdditionClip, saveAdditionClip, setAdditionTranscript } from "@/lib/additions";
import { withDrizzle } from "@/lib/db";
import { clientIp, hitRateLimit } from "@/lib/rate-limit";
import { parseVisitorId, recipientTokenSchema, VISITOR_COOKIE, visitorNameSchema } from "@/lib/reaction-input";
import { resolveVisitor } from "@/lib/reactions";
import { withAi } from "@/lib/story/ai-guard";
import { transcribe } from "@/lib/story/transcribe";
import { checkClip } from "@/lib/story/voice";
import { setVisitorCookie } from "@/lib/visitor-cookie";

// Say it (Phase 4f-4, PRD 6.10e): a friend's recording, up to 1 minute, from the Share Page. It's
// stored before speech-to-text runs, so the recording is kept even if that fails; the words come
// back for the friend to read and change. The owner sees nothing until the friend taps Send.
//
// Speech-to-text is counted against the owner's daily AI limit and follows their AI story help
// setting: the owner is the one the words are for. With it off, the friend can still type.
const fail = (error: string, status = 400) => Response.json({ error }, { status });

/** A minute of AAC or Opus is well under 1 MB; this leaves room for higher-quality recorders. */
const MAX_ADDITION_BYTES = 5 * 1024 * 1024;
/** Recordings one friend can make for one sunset in a day (Record again included). */
const VISITOR_LIMIT = 10;
/** Recordings all friends together can make for one sunset in a day, to bound the owner's AI use. */
const ENTRY_LIMIT = 60;
const DAY_MS = 24 * 60 * 60 * 1000;
const IP_LIMIT = 20;
const IP_WINDOW_MS = 60 * 60 * 1000;
const LIMIT_MESSAGE = "That's a lot of recordings for today. You can still type what you'd like to add.";

export async function POST(request: Request, ctx: RouteContext<"/s/[id]/additions/clip">) {
  const { id } = await ctx.params;
  if (Number(request.headers.get("content-length") ?? 0) > MAX_ADDITION_BYTES + 64 * 1024) return fail("That recording is too long.", 413);
  // A cross-site form could post multipart data; browsers always send Origin on POST, so check it.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return fail("Not allowed.", 403);

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob)) return fail("A recording is required.");
  if (audio.size > MAX_ADDITION_BYTES) return fail("That recording is too long.", 413);
  const check = checkClip({ size: audio.size, type: audio.type, durationMs: form?.get("durationMs") });
  if (!check.ok) return fail(check.error);
  const durationMs = Math.min(check.durationMs, (MAX_ADDITION_SECONDS + 2) * 1000);
  const name = visitorNameSchema.safeParse(form?.get("name") ?? undefined);
  const recipient = recipientTokenSchema.safeParse(form?.get("recipient") ?? undefined);

  const cookieStore = await cookies();
  const cookieId = parseVisitorId(cookieStore.get(VISITOR_COOKIE)?.value);

  const planned = await withDrizzle(async (db) => {
    if (!(await hitRateLimit(db, `additions:clip:ip:${clientIp(request.headers)}`, IP_LIMIT, IP_WINDOW_MS))) return { status: "limited" as const };
    const visitor = await resolveVisitor(db, id, {
      cookieId,
      name: name.success ? name.data : undefined,
      recipientToken: recipient.success ? recipient.data : null,
    });
    if (visitor.status !== "ok") return visitor;
    const plan = await planAdditionClip(db, id, check.extension);
    if (!plan) return { status: "not_found" as const };
    const allowed =
      (await hitRateLimit(db, `additions:clip:visitor:${visitor.visitorId}:${plan.entryId}`, VISITOR_LIMIT, DAY_MS)) &&
      (await hitRateLimit(db, `additions:clip:entry:${plan.entryId}`, ENTRY_LIMIT, DAY_MS));
    if (!allowed) return { status: "limited_visitor" as const, visitor };
    return { status: "ok" as const, plan, visitor };
  });

  if ("visitor" in planned && planned.visitor?.isNew) setVisitorCookie(cookieStore, request, planned.visitor.visitorId);
  if (planned.status === "limited") return fail("That's a lot of recordings. Please try again later.", 429);
  // 403 with a message: the recorder switches to typing and shows it.
  if (planned.status === "limited_visitor") return fail(LIMIT_MESSAGE, 403);
  if (planned.status === "need_name") return Response.json({ needName: true }, { status: 400 });
  if (planned.status === "not_found") return fail("This sunset isn't shared any more.", 404);

  const { plan, visitor } = planned;
  const { env } = await getCloudflareContext({ async: true });
  const bytes = await audio.arrayBuffer();
  await env.PHOTOS.put(plan.r2Key, bytes, { httpMetadata: { contentType: check.contentType } });
  const saved = await withDrizzle((db) =>
    saveAdditionClip(db, id, visitor.visitorId, {
      entryId: plan.entryId,
      r2Key: plan.r2Key,
      contentType: check.contentType,
      durationMs,
      sizeBytes: audio.size,
    }),
  ).catch(async (error) => {
    await env.PHOTOS.delete(plan.r2Key);
    throw error;
  });
  if (saved === "not_found") {
    await env.PHOTOS.delete(plan.r2Key);
    return fail("This sunset isn't shared any more.", 404);
  }
  // Record again: the earlier recording is gone for good.
  if (saved.oldKey) await env.PHOTOS.delete(saved.oldKey);

  const result = await withDrizzle(async (db) => {
    const transcribed = await withAi(db, plan.ownerId, "transcribe_addition", () => transcribe(env.AI, bytes));
    if (transcribed && transcribed !== "off" && transcribed !== "limited") {
      await setAdditionTranscript(db, id, visitor.visitorId, plan.r2Key, transcribed.text);
    }
    return transcribed;
  });
  const transcript = result && result !== "off" && result !== "limited" ? result.text : null;
  return Response.json({ durationMs, transcript }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
