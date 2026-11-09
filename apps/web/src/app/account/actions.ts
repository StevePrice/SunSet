"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { setAiStoryHelp } from "@/lib/settings";

/** Settings: AI story help on or off. Off is enforced on the server for every AI call. */
export async function setAiStoryHelpAction(on: boolean): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  await withDrizzle((db) => setAiStoryHelp(db, user.id, on));
  revalidatePath("/account");
  revalidatePath("/journal", "layout");
}
