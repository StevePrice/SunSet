import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { getEntry, photoKey } from "@/lib/entries";

// Serves a Journal photo to its owner only. Photos never change once saved.
export async function GET(_request: Request, ctx: RouteContext<"/api/photos/[id]/[variant]">) {
  const { id, variant } = await ctx.params;
  if (variant !== "display" && variant !== "thumb") return new Response("Not found", { status: 404 });
  const user = await getCurrentUser();
  if (!user) return new Response("Not found", { status: 404 });
  const entry = await withDrizzle((db) => getEntry(db, user.id, id));
  if (!entry) return new Response("Not found", { status: 404 });

  const { env } = await getCloudflareContext({ async: true });
  const object = await env.PHOTOS.get(photoKey(user.id, id, variant));
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=31536000, immutable",
      ETag: object.httpEtag,
    },
  });
}
