import { withDrizzle } from "@/lib/db";
import { getRecipient, getPublicShare, parseRecipientToken } from "@/lib/shares";
import { getClip } from "@/lib/story/clips";
import { serveClip } from "@/lib/story/serve-clip";

const notFound = () => new Response("Not found", { status: 404 });

// "Hear Louise tell it" (Include my voice, Phase 4f-3): the owner's recording, for a friend with the
// link, only while that link includes the voice. A personal link (?r=) has its own switch. Turning
// the voice off, stopping sharing or deleting the recording stops it at once (short private cache).
export async function GET(request: Request, ctx: RouteContext<"/s/[id]/voice/[clipId]">) {
  const { id, clipId } = await ctx.params;
  const token = parseRecipientToken(new URL(request.url).searchParams.get("r"));
  const clip = await withDrizzle(async (db) => {
    const share = await getPublicShare(db, id);
    if (!share) return null;
    const recipient = await getRecipient(db, id, token);
    if (!(recipient ? recipient.includeVoice : share.includeVoice)) return null;
    const found = await getClip(db, share.ownerId, clipId);
    return found?.entryId === share.entryId ? found : null;
  });
  if (!clip) return notFound();
  return serveClip(request, clip, "private, max-age=300");
}
