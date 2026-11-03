"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { deleteEntry, photoKey, updateEntry } from "@/lib/entries";
import { parseStory } from "@/lib/entry-input";
import {
  createShare,
  deleteShare,
  getShareForEntry,
  parsePlace,
  parseTimeZone,
  shareCardPrefix,
  updateSharePlace,
} from "@/lib/shares";

export type ActionResult = { error: string } | null;

export async function updateStoryAction(id: string, _prev: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const story = parseStory(form.get("story"));
  if (!story.ok) return { error: story.error };
  const changes = form.get("removeLocation") === "on" ? { story: story.value, location: null } : { story: story.value };
  const updated = await withDrizzle((db) => updateEntry(db, user.id, id, changes));
  if (!updated) return { error: "This entry no longer exists." };
  revalidatePath("/journal");
  revalidatePath(`/journal/${id}`);
  return null;
}

export async function deleteEntryAction(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const { deleted, shareId } = await withDrizzle(async (db) => {
    const share = await getShareForEntry(db, user.id, id);
    return { deleted: await deleteEntry(db, user.id, id), shareId: share?.id };
  });
  if (deleted) {
    const { env } = await getCloudflareContext({ async: true });
    await env.PHOTOS.delete([photoKey(user.id, id, "display"), photoKey(user.id, id, "thumb")]);
    if (shareId) await deleteShareCards(env.PHOTOS, shareId);
  }
  revalidatePath("/journal");
  redirect("/journal");
}

export type ShareLink = { url: string; place: string | null };

export async function createShareAction(entryId: string, timeZone: string): Promise<ShareLink | { error: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const share = await withDrizzle((db) => createShare(db, user.id, entryId, parseTimeZone(timeZone)));
  if (!share) return { error: "This entry no longer exists." };
  revalidatePath(`/journal/${entryId}`);
  return { url: await shareUrl(share.id), place: share.place };
}

export async function updateSharePlaceAction(entryId: string, _prev: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const place = parsePlace(form.get("place"));
  if (!place.ok) return { error: place.error };
  const updated = await withDrizzle((db) => updateSharePlace(db, user.id, entryId, place.value));
  if (!updated) return { error: "This sunset isn't shared any more." };
  revalidatePath(`/journal/${entryId}`);
  return null;
}

export async function stopSharingAction(entryId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const shareId = await withDrizzle((db) => deleteShare(db, user.id, entryId));
  if (shareId) {
    const { env } = await getCloudflareContext({ async: true });
    await deleteShareCards(env.PHOTOS, shareId);
  }
  revalidatePath(`/journal/${entryId}`);
}

async function shareUrl(shareId: string): Promise<string> {
  const { env } = await getCloudflareContext({ async: true });
  return `${env.BETTER_AUTH_URL}/s/${shareId}`;
}

async function deleteShareCards(bucket: R2Bucket, shareId: string) {
  const { objects } = await bucket.list({ prefix: shareCardPrefix(shareId) });
  if (objects.length) await bucket.delete(objects.map((o) => o.key));
}
