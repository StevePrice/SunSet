import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { createEntry, photoKey } from "@/lib/entries";
import { DAILY_ENTRY_LIMIT, ENTRY_LIMIT_MESSAGE, entriesToday } from "@/lib/limits";
import { nearestPlace } from "@/lib/places";
import { requestScore } from "@/lib/scores";
import { isJpeg, MAX_PHOTO_BYTES, MAX_THUMB_BYTES, parseEntryForm } from "@/lib/entry-input";

function badRequest(error: string) {
  return Response.json({ error }, { status: 400 });
}

// Saves a new Journal entry. The browser has already resized the photo and re-encoded it as
// JPEG (which also drops its GPS metadata), and sends it with a thumbnail.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });

  const form = await request.formData();
  const photo = form.get("photo");
  const thumb = form.get("thumb");
  if (!(photo instanceof Blob) || !(thumb instanceof Blob)) return badRequest("A photo is required.");
  if (photo.size > MAX_PHOTO_BYTES || thumb.size > MAX_THUMB_BYTES) return badRequest("The photo is too large.");
  if (!(await isJpeg(photo)) || !(await isJpeg(thumb))) return badRequest("The photo must be a JPEG.");
  const input = parseEntryForm(form);
  if (!input.ok) return badRequest(input.error);
  if ((await withDrizzle((db) => entriesToday(db, user.id))) >= DAILY_ENTRY_LIMIT) {
    return Response.json({ error: ENTRY_LIMIT_MESSAGE }, { status: 429 });
  }

  const { env, ctx } = await getCloudflareContext({ async: true });
  const id = crypto.randomUUID();
  const keys = [photoKey(user.id, id, "display"), photoKey(user.id, id, "thumb")];
  const httpMetadata = { contentType: "image/jpeg" };
  await env.PHOTOS.put(keys[0], await photo.arrayBuffer(), { httpMetadata });
  await env.PHOTOS.put(keys[1], await thumb.arrayBuffer(), { httpMetadata });
  try {
    const entry = await withDrizzle(async (db) => {
      // The place in words and the date's time zone (Phase 4e): a typed name wins over the nearest
      // town; the place's time zone wins over the phone's, since the photo may be from a trip.
      const place = input.value.location ? await nearestPlace(db, input.value.location) : null;
      return createEntry(db, user.id, id, {
        ...input.value,
        placeName: input.value.placeName ?? place?.name ?? null,
        timeZone: place?.timeZone ?? input.value.timeZone ?? null,
      });
    });
    // Scoring is best-effort: a queue hiccup must not lose the user's entry. The entry page
    // offers "Score it" when no score was requested.
    ctx.waitUntil(
      withDrizzle((db) => requestScore(db, env.SCORING, user.id, entry.id)).catch((error) =>
        console.error(`Couldn't queue scoring for ${entry.id}:`, error),
      ),
    );
    return Response.json({ id: entry.id }, { status: 201 });
  } catch (error) {
    await env.PHOTOS.delete(keys);
    throw error;
  }
}
