import { getCloudflareContext } from "@opennextjs/cloudflare";
import { withDrizzle } from "@/lib/db";
import { photoKey } from "@/lib/entries";
import { resizeJpeg } from "@/lib/image-codecs";
import { SHARE_PHOTO_EDGE } from "@/lib/photo-size";
import { getPublicShare } from "@/lib/shares";

// The photo on a share page, at the Share Page size (1800px on the long side, PRD 6.6). Public
// while the share exists; stored photos have no EXIF, so no location leaks through them.
// The share size is made from the display photo the first time it's asked for and kept in R2
// next to the other sizes, so older entries need no backfill. If that fails, the display photo is
// served instead.
export async function GET(_request: Request, ctx: RouteContext<"/s/[id]/photo">) {
  const { id } = await ctx.params;
  const share = await withDrizzle((db) => getPublicShare(db, id));
  if (!share) return new Response("Not found", { status: 404 });
  const { env, ctx: workerCtx } = await getCloudflareContext({ async: true });
  const shareKey = photoKey(share.ownerId, share.entryId, "share");

  const stored = await env.PHOTOS.get(shareKey);
  if (stored) return jpeg(stored.body, stored.httpEtag);

  const display = await env.PHOTOS.get(photoKey(share.ownerId, share.entryId, "display"));
  if (!display) return new Response("Not found", { status: 404 });
  const bytes = await display.arrayBuffer();
  try {
    const { jpeg: resized } = await resizeJpeg(bytes, SHARE_PHOTO_EDGE);
    workerCtx.waitUntil(
      env.PHOTOS.put(shareKey, resized, { httpMetadata: { contentType: "image/jpeg" } }).catch((error) =>
        console.error(`Couldn't store the share photo for ${share.entryId}:`, error),
      ),
    );
    return jpeg(resized);
  } catch (error) {
    console.error(`Couldn't make the share photo for ${share.entryId}; serving the display photo:`, error);
    return jpeg(bytes, display.httpEtag);
  }
}

function jpeg(body: BodyInit, etag?: string): Response {
  return new Response(body, {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=300", ...(etag && { ETag: etag }) },
  });
}
