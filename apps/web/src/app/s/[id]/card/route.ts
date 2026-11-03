import { getCloudflareContext } from "@opennextjs/cloudflare";
import { withDrizzle } from "@/lib/db";
import { photoKey } from "@/lib/entries";
import { cardContent, cardVersion, renderCard } from "@/lib/share-card";
import { getPublicShare, shareCardPrefix } from "@/lib/shares";

// The share card for /s/[id]. Public, like the share page. The ?v= on the URL only busts
// caches; the card is always drawn from the share's current content.
export async function GET(_request: Request, ctx: RouteContext<"/s/[id]/card">) {
  const { id } = await ctx.params;
  const share = await withDrizzle((db) => getPublicShare(db, id));
  if (!share) return new Response("Not found", { status: 404 });

  const { env, ctx: worker } = await getCloudflareContext({ async: true });
  const content = cardContent(share);
  const key = `${shareCardPrefix(id)}card-${await cardVersion(content)}.png`;
  let png: ArrayBuffer | null = (await (await env.PHOTOS.get(key))?.arrayBuffer()) ?? null;
  if (!png) {
    const photo = await env.PHOTOS.get(photoKey(share.ownerId, share.entryId, "display"));
    if (!photo) return new Response("Not found", { status: 404 });
    png = await renderCard(content, await photo.arrayBuffer());
    worker.waitUntil(replaceCachedCards(env.PHOTOS, id, key, png));
  }
  return new Response(png, {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300" },
  });
}

// Stores the new card and drops older versions of it.
async function replaceCachedCards(bucket: R2Bucket, shareId: string, key: string, png: ArrayBuffer) {
  await bucket.put(key, png, { httpMetadata: { contentType: "image/png" } });
  const { objects } = await bucket.list({ prefix: shareCardPrefix(shareId) });
  const stale = objects.map((o) => o.key).filter((k) => k !== key);
  if (stale.length) await bucket.delete(stale);
}
