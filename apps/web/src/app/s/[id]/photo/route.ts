import { getCloudflareContext } from "@opennextjs/cloudflare";
import { withDrizzle } from "@/lib/db";
import { photoKey } from "@/lib/entries";
import { getPublicShare } from "@/lib/shares";

// The photo on a share page. Public while the share exists; the stored photo has no EXIF, so
// no location leaks through it.
export async function GET(_request: Request, ctx: RouteContext<"/s/[id]/photo">) {
  const { id } = await ctx.params;
  const share = await withDrizzle((db) => getPublicShare(db, id));
  if (!share) return new Response("Not found", { status: 404 });
  const { env } = await getCloudflareContext({ async: true });
  const object = await env.PHOTOS.get(photoKey(share.ownerId, share.entryId, "display"));
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=300", ETag: object.httpEtag },
  });
}
