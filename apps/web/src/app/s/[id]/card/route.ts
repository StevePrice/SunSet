import { cachedCardPng, pngResponse } from "@/lib/card-cache";
import { withDrizzle } from "@/lib/db";
import { getPublicShare } from "@/lib/shares";

// The share card for /s/[id]. Public, like the share page. The ?v= on the URL only busts
// caches; the card is always drawn from the share's current content.
export async function GET(_request: Request, ctx: RouteContext<"/s/[id]/card">) {
  const { id } = await ctx.params;
  const share = await withDrizzle((db) => getPublicShare(db, id));
  if (!share) return new Response("Not found", { status: 404 });
  return pngResponse(await cachedCardPng(share, "card"));
}
