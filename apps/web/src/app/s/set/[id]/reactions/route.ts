import { cookies } from "next/headers";
import { anonymous, track } from "@/lib/analytics";
import { withDrizzle } from "@/lib/db";
import { clientIp, hitRateLimit } from "@/lib/rate-limit";
import { parseReactionRequest, parseVisitorId, VISITOR_COOKIE } from "@/lib/reaction-input";
import { resolveSetVisitor, setSetNote, toggleSetReaction } from "@/lib/share-sets";
import { setVisitorCookie } from "@/lib/visitor-cookie";

// One reply for a whole set (4f-5, Build Spec 2.5): reactions and a note, like a single shared
// sunset. A set is always for one named person, so it never asks for a name.
const IP_LIMIT = 60;
const IP_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: Request, ctx: RouteContext<"/s/set/[id]/reactions">) {
  // A JSON body can't be sent cross-site without a CORS preflight, which this route never allows.
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ error: "Expected JSON." }, { status: 415 });
  }
  const { id } = await ctx.params;
  const parsed = parseReactionRequest(await request.json().catch(() => null));
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const input = parsed.value;

  const cookieStore = await cookies();
  const cookieId = parseVisitorId(cookieStore.get(VISITOR_COOKIE)?.value);

  const result = await withDrizzle(async (db) => {
    if (!(await hitRateLimit(db, `reactions:ip:${clientIp(request.headers)}`, IP_LIMIT, IP_WINDOW_MS))) return { status: "limited" as const };
    const visitor = await resolveSetVisitor(db, id, cookieId);
    if (visitor.status !== "ok") return visitor;
    const outcome =
      input.action === "toggle" ? await toggleSetReaction(db, id, visitor.visitorId, input.kind) : await setSetNote(db, id, visitor.visitorId, input.note);
    return { ...outcome, visitorId: visitor.visitorId, isNew: visitor.isNew };
  });

  if ("isNew" in result && result.isNew) setVisitorCookie(cookieStore, request, result.visitorId);
  if (result.status === "limited") return Response.json({ error: "That's a lot of taps. Please try again later." }, { status: 429 });
  if (result.status === "not_found") return Response.json({ error: "These sunsets aren't shared any more." }, { status: 404 });
  const received = input.action === "toggle" ? result.reactions.mine.includes(input.kind) : input.note !== null;
  if (received) {
    await track(input.action === "toggle" ? "set_reaction_received" : "set_note_received", result.visitorId, anonymous({
      set_id: id,
      ...(input.action === "toggle" && { kind: input.kind }),
    }).properties);
  }
  return Response.json(result.reactions, { headers: { "Cache-Control": "no-store" } });
}
