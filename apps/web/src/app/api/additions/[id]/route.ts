import { getAdditionClip } from "@/lib/additions";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { serveClip } from "@/lib/story/serve-clip";

const notFound = () => new Response("Not found", { status: 404 });

// "Hear Steve tell it" (Phase 4f-4): a friend's recording, for the owner of the sunset only.
// Remove deletes it for good, so the private cache is kept short.
export async function GET(request: Request, ctx: RouteContext<"/api/additions/[id]">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return notFound();
  const clip = await withDrizzle((db) => getAdditionClip(db, user.id, id));
  if (!clip) return notFound();
  return serveClip(request, clip, "private, max-age=300");
}
