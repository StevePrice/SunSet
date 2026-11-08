import { cachedCardJpeg, jpegResponse } from "@/lib/card-cache";
import { withDrizzle } from "@/lib/db";
import { getPublicShare } from "@/lib/shares";

// The vertical Stories card (1080×1920) for /s/[id], which the share sheet attaches as a file.
// Public, like the share page; ?v= only busts caches.
export async function GET(_request: Request, ctx: RouteContext<"/s/[id]/stories">) {
  const { id } = await ctx.params;
  const share = await withDrizzle((db) => getPublicShare(db, id));
  if (!share) return new Response("Not found", { status: 404 });
  return jpegResponse(await cachedCardJpeg(share, "stories"), "sunset-soul-story.jpg");
}
