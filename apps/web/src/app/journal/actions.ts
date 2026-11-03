"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { deleteEntry, photoKey, updateEntry } from "@/lib/entries";
import { parseStory } from "@/lib/entry-input";

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
  const deleted = await withDrizzle((db) => deleteEntry(db, user.id, id));
  if (deleted) {
    const { env } = await getCloudflareContext({ async: true });
    await env.PHOTOS.delete([photoKey(user.id, id, "display"), photoKey(user.id, id, "thumb")]);
  }
  revalidatePath("/journal");
  redirect("/journal");
}
