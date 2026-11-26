import { withDrizzle } from "@/lib/db";
import { serveSharePhoto } from "@/lib/share-photo";
import { setEntryOwner } from "@/lib/share-sets";

// One sunset's photo on a set page (4f-5). Public while the set is shared and the sunset is in it.
export async function GET(_request: Request, ctx: RouteContext<"/s/set/[id]/photo/[entryId]">) {
  const { id, entryId } = await ctx.params;
  const owner = await withDrizzle((db) => setEntryOwner(db, id, entryId));
  if (!owner) return new Response("Not found", { status: 404 });
  return serveSharePhoto(owner.ownerId, entryId);
}
