import { cookies } from "next/headers";
import { anonymous, type Properties, shareFacts, track } from "@/lib/analytics";
import { withDrizzle } from "@/lib/db";
import { clientIp, hitRateLimit } from "@/lib/rate-limit";
import {
  parseReactionRequest,
  parseVisitorId,
  VISITOR_COOKIE,
  VISITOR_COOKIE_MAX_AGE,
} from "@/lib/reaction-input";
import { createVisitor, getVisitorName, isShareLive, setReactionNote, toggleReaction } from "@/lib/reactions";
import { getRecipient, linkRecipientVisitor } from "@/lib/shares";

// A friend reacting to a shared sunset: no account, just an anonymous id in a cookie and the
// first name they gave on their first tap. Positive reactions only; counts are public, names
// and notes go only to the owner (Afterglow).
const IP_LIMIT = 60;
const IP_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: Request, ctx: RouteContext<"/s/[id]/reactions">) {
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
    if (!(await hitRateLimit(db, `reactions:ip:${clientIp(request.headers)}`, IP_LIMIT, IP_WINDOW_MS))) {
      return { status: "limited" as const };
    }
    // The name is asked for once per device; a cookie whose visitor is gone counts as new.
    let visitorId = cookieId && (await getVisitorName(db, cookieId)) !== null ? cookieId : null;
    let isNew = false;
    // A personal link (4f-3) knows who it's for, so it never asks for a first name.
    const recipient = await getRecipient(db, id, input.recipient ?? null);
    if (!visitorId) {
      // Don't create a visitor (or set a cookie) for a link that's been stopped.
      if (!(await isShareLive(db, id))) return { status: "not_found" as const };
      const name = input.name ?? recipient?.name;
      if (!name) return { status: "need_name" as const };
      visitorId = await createVisitor(db, name);
      isNew = true;
    }
    // So From your friends shows their "Wish I was there" as "I was there!".
    if (recipient && !recipient.visitorId) await linkRecipientVisitor(db, recipient.id, visitorId);
    const outcome =
      input.action === "toggle"
        ? await toggleReaction(db, id, visitorId, input.kind)
        : await setReactionNote(db, id, visitorId, input.note);
    return { ...outcome, visitorId, isNew };
  });

  if ("isNew" in result && result.isNew) {
    cookieStore.set(VISITOR_COOKIE, result.visitorId, {
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: VISITOR_COOKIE_MAX_AGE,
    });
  }
  if (result.status === "limited") {
    return Response.json({ error: "That's a lot of taps. Please try again later." }, { status: 429 });
  }
  if (result.status === "need_name") return Response.json({ needName: true }, { status: 400 });
  if (result.status === "not_found") {
    return Response.json({ error: "This sunset isn't shared any more." }, { status: 404 });
  }
  // A friend's reaction or note reaching the owner (not a reaction taken back, or a note removed).
  const received =
    input.action === "toggle" ? result.reactions.mine.includes(input.kind) : input.note !== null;
  if (received) {
    const facts = await withDrizzle((db) => shareFacts(db, id));
    const extra: Properties = { personal: Boolean(input.recipient), ...(input.action === "toggle" && { kind: input.kind }) };
    await track(input.action === "toggle" ? "reaction_received" : "note_received", result.visitorId, anonymous({ ...facts, ...extra }).properties);
  }
  return Response.json(result.reactions, { headers: { "Cache-Control": "no-store" } });
}
