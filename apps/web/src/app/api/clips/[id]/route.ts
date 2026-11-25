import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { getClip } from "@/lib/story/clips";
import { serveClip } from "@/lib/story/serve-clip";

const notFound = () => new Response("Not found", { status: 404 });

// Serves a voice recording to its owner only, with Range support (Safari needs it to play audio).
// Recordings never change once saved; deleting one removes it for good.
export async function GET(request: Request, ctx: RouteContext<"/api/clips/[id]">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return notFound();
  const clip = await withDrizzle((db) => getClip(db, user.id, id));
  if (!clip) return notFound();

  return serveClip(request, clip, "private, max-age=3600");
}
