"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { firstNameSchema } from "@/lib/first-name";
import { setFirstName } from "@/lib/profile";
import { deleteAccountFiles, deleteOwnAccount, parseAdminEmails } from "@/lib/user-admin";
import { setAiStoryHelp } from "@/lib/settings";

/** Settings: AI story help on or off. Off is enforced on the server for every AI call. */
export async function setAiStoryHelpAction(on: boolean): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  await withDrizzle((db) => setAiStoryHelp(db, user.id, on));
  revalidatePath("/account");
  revalidatePath("/journal", "layout");
}

/**
 * Saves the first name friends see (Welcome and You). Returns the saved name, or a message to show.
 * The Share Page reads the name when it's opened, so existing links pick it up at once.
 */
export async function saveFirstNameAction(input: string): Promise<{ name: string } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const parsed = firstNameSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please type your first name." };
  await withDrizzle((db) => setFirstName(db, user.id, parsed.data));
  revalidatePath("/account");
  revalidatePath("/journal", "layout");
  return { name: parsed.data };
}

/**
 * You → Delete my account (Phase 7a user rights): removes the account, every sunset, photo,
 * recording, share link and the reactions on them, then signs out (the sessions go with the
 * account). Returns a message if it can't, e.g. for the last admin.
 */
export async function deleteMyAccountAction(): Promise<{ error: string } | void> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const { env } = await getCloudflareContext({ async: true });
  const result = await withDrizzle((db) => deleteOwnAccount(db, user.id, parseAdminEmails(env.ADMIN_EMAILS)));
  if (!result.ok) return { error: result.error };
  try {
    await deleteAccountFiles(env.PHOTOS, result.userId, result.shareIds);
  } catch (error) {
    // The account is gone and nothing serves these files without it; leave a trace to clean up.
    console.error(`Deleted account ${user.id} but couldn't remove all its R2 files:`, error);
  }
  redirect("/?deleted=1");
}
