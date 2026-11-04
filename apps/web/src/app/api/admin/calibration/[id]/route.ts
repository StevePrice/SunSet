import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";

// A reference photo for calibration, for admins only.
export async function GET(_request: Request, ctx: RouteContext<"/api/admin/calibration/[id]">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user || !(await withDrizzle((db) => isAdmin(db, user.id)))) return new Response("Not found", { status: 404 });
  if (!/^[a-z0-9-]+$/.test(id)) return new Response("Not found", { status: 404 });
  const { env } = await getCloudflareContext({ async: true });
  const object = await env.PHOTOS.get(`calibration/${id}.jpg`);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=86400", ETag: object.httpEtag },
  });
}
