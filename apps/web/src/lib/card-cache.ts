import { getCloudflareContext } from "@opennextjs/cloudflare";
import { photoKey } from "@/lib/entries";
import {
  cardContent,
  cardVersion,
  renderCard,
  renderStoriesCard,
  storiesCardContent,
  type CardKind,
} from "@/lib/share-card";
import { shareCardPrefix, type PublicShare } from "@/lib/shares";

/** The share's image of this kind as a PNG, from R2 if drawn before; null if the photo is gone. */
export async function cachedCardPng(share: PublicShare, kind: CardKind): Promise<ArrayBuffer | null> {
  const { env, ctx } = await getCloudflareContext({ async: true });
  const content = kind === "card" ? cardContent(share) : storiesCardContent(share);
  const prefix = `${shareCardPrefix(share.id)}${kind}-`;
  const key = `${prefix}${await cardVersion(content, kind)}.png`;
  const cached = await env.PHOTOS.get(key);
  if (cached) return cached.arrayBuffer();

  const photo = await env.PHOTOS.get(photoKey(share.ownerId, share.entryId, "display"));
  if (!photo) return null;
  const bytes = await photo.arrayBuffer();
  const png = kind === "card" ? await renderCard(cardContent(share), bytes) : await renderStoriesCard(storiesCardContent(share), bytes);
  ctx.waitUntil(replaceCached(env.PHOTOS, prefix, key, png));
  return png;
}

// Stores the new image and drops older versions of the same kind.
async function replaceCached(bucket: R2Bucket, prefix: string, key: string, png: ArrayBuffer) {
  await bucket.put(key, png, { httpMetadata: { contentType: "image/png" } });
  const { objects } = await bucket.list({ prefix });
  const stale = objects.map((o) => o.key).filter((k) => k !== key);
  if (stale.length) await bucket.delete(stale);
}

export function pngResponse(png: ArrayBuffer | null, filename?: string): Response {
  if (!png) return new Response("Not found", { status: 404 });
  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=300",
      ...(filename && { "Content-Disposition": `inline; filename="${filename}"` }),
    },
  });
}
