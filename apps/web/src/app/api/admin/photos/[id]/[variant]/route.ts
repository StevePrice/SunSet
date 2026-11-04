import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getEntryOwner, isAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { photoKey } from "@/lib/entries";

// Any entry's photo, for admins only.
export async function GET(_request: Request, ctx: RouteContext<"/api/admin/photos/[id]/[variant]">) {
  const { id, variant } = await ctx.params;
  if (variant !== "display" && variant !== "thumb") return new Response("Not found", { status: 404 });
  const user = await getCurrentUser();
  if (!user) return new Response("Not found", { status: 404 });
  const ownerId = await withDrizzle(async (db) => ((await isAdmin(db, user.id)) ? getEntryOwner(db, id) : null));
  if (!ownerId) return new Response("Not found", { status: 404 });
  const { env } = await getCloudflareContext({ async: true });
  const object = await env.PHOTOS.get(photoKey(ownerId, id, variant));
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600", ETag: object.httpEtag },
  });
}
