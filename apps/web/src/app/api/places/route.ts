import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { parseLocation } from "@/lib/entry-input";
import { nearestPlace } from "@/lib/places";

// The nearest town for a point, so New sunset can show "Carlsbad, California" before saving.
// Signed-in only; the lookup runs in our own database (GeoNames), so the point goes nowhere else.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const location = parseLocation(params.get("lat"), params.get("lng"));
  if (!location.ok || !location.value) return Response.json({ error: "A location is required." }, { status: 400 });
  const place = await withDrizzle((db) => nearestPlace(db, location.value!));
  return Response.json({ name: place.name }, { headers: { "Cache-Control": "private, max-age=3600" } });
}
