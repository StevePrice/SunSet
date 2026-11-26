import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cookies } from "next/headers";
import { anonymous, shareFacts, track } from "@/lib/analytics";
import { parseAdditionRequest } from "@/lib/addition-input";
import { sendAddition } from "@/lib/additions";
import { withDrizzle } from "@/lib/db";
import { clientIp, hitRateLimit } from "@/lib/rate-limit";
import { parseVisitorId, VISITOR_COOKIE } from "@/lib/reaction-input";
import { resolveVisitor } from "@/lib/reactions";
import { setVisitorCookie } from "@/lib/visitor-cookie";

// Add to the story (Phase 4f-4, PRD 6.10e): a friend's Send. The words they typed, or their
// recording (already uploaded to ./clip) with its words as they left them. No account; the same
// visitor cookie and first name as reactions. Only the owner ever sees it.
const IP_LIMIT = 30;
const IP_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: Request, ctx: RouteContext<"/s/[id]/additions">) {
  // JSON only, so a cross-site form can't post here (no CORS preflight is ever allowed).
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ error: "Expected JSON." }, { status: 415 });
  }
  const { id } = await ctx.params;
  const parsed = parseAdditionRequest(await request.json().catch(() => null));
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const input = parsed.value;

  const cookieStore = await cookies();
  const cookieId = parseVisitorId(cookieStore.get(VISITOR_COOKIE)?.value);

  const result = await withDrizzle(async (db) => {
    if (!(await hitRateLimit(db, `additions:ip:${clientIp(request.headers)}`, IP_LIMIT, IP_WINDOW_MS))) {
      return { status: "limited" as const };
    }
    const visitor = await resolveVisitor(db, id, { cookieId, name: input.name, recipientToken: input.recipient });
    if (visitor.status !== "ok") return visitor;
    const sent = await sendAddition(db, id, visitor.visitorId, { text: input.text, spoken: input.spoken });
    return { ...sent, visitorId: visitor.visitorId, isNew: visitor.isNew };
  });

  if ("isNew" in result && result.isNew) setVisitorCookie(cookieStore, request, result.visitorId);
  if (result.status === "limited") return Response.json({ error: "That's a lot of sending. Please try again later." }, { status: 429 });
  if (result.status === "need_name") return Response.json({ needName: true }, { status: 400 });
  if (result.status === "not_found") return Response.json({ error: "This sunset isn't shared any more." }, { status: 404 });
  if (result.status === "empty") return Response.json({ error: "Type something, or tap Say it, to add to the story." }, { status: 400 });

  if (result.droppedKey) {
    const { env } = await getCloudflareContext({ async: true });
    await env.PHOTOS.delete(result.droppedKey);
  }
  if (result.addition) {
    const facts = await withDrizzle((db) => shareFacts(db, id));
    await track("story_added", result.visitorId, anonymous({ ...facts, spoken: result.addition.spoken, personal: Boolean(input.recipient) }).properties);
  }
  return Response.json({ addition: result.addition }, { headers: { "Cache-Control": "no-store" } });
}
