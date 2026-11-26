import { withDrizzle } from "@/lib/db";
import { getPublicSet, setEntryOwner } from "@/lib/share-sets";
import { getClip } from "@/lib/story/clips";
import { serveClip } from "@/lib/story/serve-clip";

// "Hear Louise tell it" on a set page (4f-5): the owner's recording for a sunset in the set, only
// while the set includes the voice. Stopping the set, turning the voice off or deleting the
// recording stops it at once (short private cache).
export async function GET(request: Request, ctx: RouteContext<"/s/set/[id]/voice/[clipId]">) {
  const { id, clipId } = await ctx.params;
  const clip = await withDrizzle(async (db) => {
    const set = await getPublicSet(db, id);
    if (!set?.includeVoice) return null;
    const found = await getClip(db, set.ownerId, clipId);
    if (!found || !(await setEntryOwner(db, id, found.entryId))) return null;
    return found;
  });
  if (!clip) return new Response("Not found", { status: 404 });
  return serveClip(request, clip, "private, max-age=300");
}
