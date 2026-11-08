import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { getEntry } from "@/lib/entries";
import { getScore, requestScore } from "@/lib/scores";

// The entry page polls this until scoring finishes.
export async function GET(_request: Request, ctx: RouteContext<"/api/entries/[id]/score">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
  const score = await withDrizzle((db) => getScore(db, user.id, id));
  return Response.json(score ?? { status: "none" }, { headers: { "Cache-Control": "no-store" } });
}

// "Try again" / "Score it": re-queues the entry.
export async function POST(_request: Request, ctx: RouteContext<"/api/entries/[id]/score">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
  const { env } = await getCloudflareContext({ async: true });
  const status = await withDrizzle(async (db) => {
    if (!(await getEntry(db, user.id, id))) return null;
    return requestScore(db, env.SCORING, user.id, id, { force: true });
  });
  if (!status) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ status });
}
