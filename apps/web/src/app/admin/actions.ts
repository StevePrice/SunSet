"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { revalidatePath } from "next/cache";
import { queueRescoreAll, requireAdmin } from "@/lib/admin";
import { isParam, nextPair, recordVote, type Choice, type Pair } from "@/lib/calibration";
import { withDrizzle } from "@/lib/db";

export async function rescoreAllAction(): Promise<{ queued: number }> {
  await requireAdmin();
  const { env } = await getCloudflareContext({ async: true });
  const queued = await withDrizzle((db) => queueRescoreAll(db, env.SCORING));
  revalidatePath("/admin");
  return { queued };
}

/** Records a side-by-side vote and returns the next pair. */
export async function voteAction(param: string, leftId: string, rightId: string, choice: Choice): Promise<Pair | null> {
  const admin = await requireAdmin();
  if (!isParam(param) || !["left", "right", "same"].includes(choice)) throw new Error("Bad vote.");
  return withDrizzle(async (db) => {
    await recordVote(db, admin.id, param, leftId, rightId, choice);
    return nextPair(db, admin.id, param);
  });
}
