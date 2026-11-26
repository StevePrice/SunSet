import { withDrizzle } from "@/lib/db";
import { serveSharePhoto } from "@/lib/share-photo";
import { getPublicShare } from "@/lib/shares";

// The photo on a share page. Public while the share exists.
export async function GET(_request: Request, ctx: RouteContext<"/s/[id]/photo">) {
  const { id } = await ctx.params;
  const share = await withDrizzle((db) => getPublicShare(db, id));
  if (!share) return new Response("Not found", { status: 404 });
  return serveSharePhoto(share.ownerId, share.entryId);
}
