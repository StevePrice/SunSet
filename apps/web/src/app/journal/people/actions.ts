"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { track } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { parseName } from "@/lib/people-input";
import { parseSetEntryIds } from "@/lib/share-set-input";
import { deleteSetNote, deleteSetReaction, shareSet, stopSet } from "@/lib/share-sets";
import { parseTimeZone } from "@/lib/shares";

// Shared sets (Phase 4f-5): "Send Steve all your sunsets together", from Sunsets with [Name].

const peoplePath = (name: string) => `/journal/people/${encodeURIComponent(name)}`;

/**
 * Share N sunsets: makes the person's set, or changes their live one (same link), with the sunsets
 * left checked. `total` is how many were on the review list, for analytics.
 */
export async function shareSetAction(input: {
  personName: string;
  entryIds: string[];
  total: number;
  includeVoice: boolean;
  timeZone: string;
}): Promise<{ url: string; count: number } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const personName = parseName(input.personName);
  const entryIds = parseSetEntryIds(input.entryIds);
  if (!personName) return { error: "That name doesn't look right." };
  if (!entryIds) return { error: "Pick at least one sunset to send." };
  const set = await withDrizzle((db) =>
    shareSet(db, user.id, { personName, entryIds, includeVoice: input.includeVoice === true, timeZone: parseTimeZone(input.timeZone) }),
  );
  if (!set) return { error: "Those sunsets aren't in your Journal any more." };
  await track("set_shared", user.id, {
    set_id: set.id,
    sunsets: set.count,
    left_out: Math.max(0, Math.round(Number(input.total) || 0) - set.count),
    include_voice: input.includeVoice === true,
    new_set: set.isNew,
  });
  revalidatePath(peoplePath(personName));
  const { env } = await getCloudflareContext({ async: true });
  return { url: `${env.BETTER_AUTH_URL}/s/set/${set.id}`, count: set.count };
}

/** Stop sharing a set: its link stops working for good. The replies stay here. */
export async function stopSetAction(personName: string, setId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  await withDrizzle((db) => stopSet(db, user.id, setId));
  revalidatePath(peoplePath(personName));
}

/** Remove, on a reaction or note a friend sent for a set. */
export async function deleteSetReplyAction(personName: string, target: { reactionId: string } | { noteId: string }): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  await withDrizzle((db) => ("reactionId" in target ? deleteSetReaction(db, user.id, target.reactionId) : deleteSetNote(db, user.id, target.noteId)));
  revalidatePath(peoplePath(personName));
}
