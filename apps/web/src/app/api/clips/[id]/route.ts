import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { getClip } from "@/lib/story/clips";
import { parseRange } from "@/lib/story/voice";

const notFound = () => new Response("Not found", { status: 404 });

// Serves a voice recording to its owner only, with Range support (Safari needs it to play audio).
// Recordings never change once saved; deleting one removes it for good.
export async function GET(request: Request, ctx: RouteContext<"/api/clips/[id]">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return notFound();
  const clip = await withDrizzle((db) => getClip(db, user.id, id));
  if (!clip) return notFound();

  const { env } = await getCloudflareContext({ async: true });
  const headers = new Headers({
    "Content-Type": clip.contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
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
