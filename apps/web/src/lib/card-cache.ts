import { getCloudflareContext } from "@opennextjs/cloudflare";
import { photoKey } from "@/lib/entries";
import { pngToJpeg } from "@/lib/image-codecs";
import {
  cardContent,
  cardVersion,
  renderCard,
  renderStoriesCard,
  storiesCardContent,
  type CardKind,
} from "@/lib/share-card";
import { shareCardPrefix, type PublicShare } from "@/lib/shares";

/** R2 key of a share's image of this kind at this version (a hash of what's drawn on it). */
export function cardKey(shareId: string, kind: CardKind, version: string): string {
  return `${shareCardPrefix(shareId)}${kind}-${version}.jpg`;
}

/**
 * The share's image of this kind as a JPEG, from R2 if made before; null if the photo is gone.
 * next/og draws a PNG (often several MB), which is re-encoded as a JPEG before it's stored.
 */
export async function cachedCardJpeg(share: PublicShare, kind: CardKind): Promise<CardImage | null> {
  const { env, ctx } = await getCloudflareContext({ async: true });
  const content = kind === "card" ? cardContent(share) : storiesCardContent(share);
  const key = cardKey(share.id, kind, await cardVersion(content, kind));
  const cached = await env.PHOTOS.get(key);
  if (cached) return { bytes: await cached.arrayBuffer(), type: "image/jpeg" };

  const photo = await env.PHOTOS.get(photoKey(share.ownerId, share.entryId, "display"));
  if (!photo) return null;
  const bytes = await photo.arrayBuffer();
  const png = kind === "card" ? await renderCard(cardContent(share), bytes) : await renderStoriesCard(storiesCardContent(share), bytes);
  let jpeg: ArrayBuffer;
  try {
    jpeg = await pngToJpeg(png);
  } catch (error) {
    // Serve the PNG rather than fail; nothing is stored, so the next request tries again.
    console.error(`Couldn't encode the ${kind} image for share ${share.id} as a JPEG; serving the PNG:`, error);
    return { bytes: png, type: "image/png" };
  }
  ctx.waitUntil(replaceCached(env.PHOTOS, `${shareCardPrefix(share.id)}${kind}-`, key, jpeg));
  return { bytes: jpeg, type: "image/jpeg" };
}

/** A share image: a JPEG, or the PNG next/og drew if JPEG encoding failed. */
export type CardImage = { bytes: ArrayBuffer; type: "image/jpeg" | "image/png" };

// Stores the new image and drops older versions of the same kind (including old PNGs).
async function replaceCached(bucket: R2Bucket, prefix: string, key: string, jpeg: ArrayBuffer) {
  await bucket.put(key, jpeg, { httpMetadata: { contentType: "image/jpeg" } });
  const { objects } = await bucket.list({ prefix });
  const stale = objects.map((o) => o.key).filter((k) => k !== key);
  if (stale.length) await bucket.delete(stale);
}

/** `name` is the download name without its extension, which follows the image's type. */
export function jpegResponse(image: CardImage | null, name?: string): Response {
  if (!image) return new Response("Not found", { status: 404 });
  const extension = image.type === "image/png" ? "png" : "jpg";
  return new Response(image.bytes, {
    headers: {
      "Content-Type": image.type,
      "Cache-Control": "public, max-age=300",
      ...(name && { "Content-Disposition": `inline; filename="${name}.${extension}"` }),
    },
  });
}
