import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { getEntry } from "@/lib/entries";

// The story screen asks this while a new sunset is being scored, to show "Who's in this one?"
// as soon as the people check says yes. Only yes, no or not yet; never how the check decided.
export async function GET(_request: Request, ctx: RouteContext<"/api/entries/[id]/people">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
  const entry = await withDrizzle((db) => getEntry(db, user.id, id));
  if (!entry) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ hasPeople: entry.hasPeople }, { headers: { "Cache-Control": "no-store" } });
}
