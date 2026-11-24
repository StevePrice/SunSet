// Streams a voice recording from R2 with Range support (Safari needs it to play audio). Shared by
// the owner's /api/clips/[id] and friends' /s/[id]/voice/[clipId] (Include my voice, 4f-3).
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { parseRange } from "@/lib/story/voice";

export async function serveClip(
  request: Request,
  clip: { r2Key: string; contentType: string; sizeBytes: number },
  cacheControl: string,
): Promise<Response> {
  const notFound = () => new Response("Not found", { status: 404 });
  const { env } = await getCloudflareContext({ async: true });
  const headers = new Headers({
    "Content-Type": clip.contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": cacheControl,
    "X-Content-Type-Options": "nosniff",
  });
  const size = clip.sizeBytes;
  const range = parseRange(request.headers.get("range"), size);
  if (range === "invalid") {
    headers.set("Content-Range", `bytes */${size}`);
    return new Response(null, { status: 416, headers });
  }
  const object = await env.PHOTOS.get(clip.r2Key, range ? { range } : undefined);
  if (!object) return notFound();
  headers.set("ETag", object.httpEtag);
  if (!range) {
    headers.set("Content-Length", String(size));
    return new Response(object.body, { headers });
  }
  headers.set("Content-Range", `bytes ${range.offset}-${range.offset + range.length - 1}/${size}`);
  headers.set("Content-Length", String(range.length));
  return new Response(object.body, { status: 206, headers });
}
