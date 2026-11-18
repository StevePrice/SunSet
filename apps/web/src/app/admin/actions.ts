"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { revalidatePath } from "next/cache";
import { queueRescoreAll, requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/admin-log";
import { isParam, nextPair, recordVote, type Choice, type Pair } from "@/lib/calibration";
import { withDrizzle } from "@/lib/db";
import {
  deleteAccount,
  deleteAccountFiles,
  parseAdminEmails,
  setDisabled,
  setRole,
  signOutEverywhere,
} from "@/lib/user-admin";

export async function rescoreAllAction(): Promise<{ queued: number }> {
  const admin = await requireAdmin();
  const { env } = await getCloudflareContext({ async: true });
  const queued = await withDrizzle(async (db) => {
    const queued = await queueRescoreAll(db, env.SCORING);
    await logAdminAction(db, { adminId: admin.id, action: "rescore_all", details: { queued } });
    return queued;
  });
  revalidatePath("/admin");
  return { queued };
}

// The account actions return an error message for the page to show, or null when it worked.
export type AccountResult = { error: string } | null;

async function adminEmails() {
  const { env } = await getCloudflareContext({ async: true });
  return parseAdminEmails(env.ADMIN_EMAILS);
}

function done(result: { ok: true } | { ok: false; error: string }): AccountResult {
  if (!result.ok) return { error: result.error };
  revalidatePath("/admin");
  return null;
}

export async function setRoleAction(userId: string, role: string): Promise<AccountResult> {
  const admin = await requireAdmin();
  const emails = await adminEmails();
  return done(await withDrizzle((db) => setRole(db, admin.id, userId, role, emails)));
}

export async function setDisabledAction(userId: string, disabled: boolean): Promise<AccountResult> {
  const admin = await requireAdmin();
  const emails = await adminEmails();
  return done(await withDrizzle((db) => setDisabled(db, admin.id, userId, disabled, emails)));
}

export async function signOutEverywhereAction(userId: string): Promise<AccountResult> {
  const admin = await requireAdmin();
  return done(await withDrizzle((db) => signOutEverywhere(db, admin.id, userId)));
}

export async function deleteAccountAction(userId: string): Promise<AccountResult> {
  const admin = await requireAdmin();
  const emails = await adminEmails();
  const result = await withDrizzle((db) => deleteAccount(db, admin.id, userId, emails));
  if (!result.ok) return { error: result.error };
  // The account is gone; now its photos, recordings and share cards. If this fails the files are
  // orphaned but unreachable (nothing serves them without an account), so say so instead of undoing.
  const { env } = await getCloudflareContext({ async: true });
  revalidatePath("/admin");
  try {
    await deleteAccountFiles(env.PHOTOS, result.userId, result.shareIds);
  } catch (error) {
    console.error(`Deleted account ${userId} but couldn't remove all its R2 files:`, error);
    return { error: "The account is deleted, but some of its photos could not be removed from storage. See the logs." };
  }
  return null;
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
