// What admins can do to an account: change its role, disable or enable it, sign it out everywhere,
// delete it. Every change is logged in admin_log in the same transaction as the change itself.
//
// Better Auth's admin plugin was considered and not used (see the phase 5b pull request): it would
// add HTTP endpoints we don't want (impersonation, set password), and it has no last-admin rule,
// activity log or R2 clean-up. The one thing worth copying from it, refusing to start a session for
// a banned user whatever the sign-in method, is `onSessionStart` below, wired into auth.ts.
import { and, eq, inArray, isNull, ne, notExists, or, sql } from "drizzle-orm";
import { entries, reactionNotes, reactions, reactionVisitors, sessions, shares, users, verifications } from "@/db/schema";
import { logAdminAction, type Executor } from "@/lib/admin-log";
import type { Db } from "@/lib/db";

export const ROLES = ["user", "admin"] as const;
export type Role = (typeof ROLES)[number];

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** ADMIN_EMAILS: comma-separated (spaces and newlines also work), compared in lower case. */
export function parseAdminEmails(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(/[\s,]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Makes the account an admin if its email is in ADMIN_EMAILS, so a deployment can't lock itself
 * out. Only for a verified, enabled account: otherwise anyone could sign up with an admin's
 * address and be promoted before the real owner proved it was theirs.
 */
export async function promoteListedAdmin(db: Executor, userId: string, adminEmails: Set<string>): Promise<boolean> {
  if (!adminEmails.size) return false;
  const promoted = await db
    .update(users)
    .set({ role: "admin" })
    .where(
      and(
        eq(users.id, userId),
        ne(users.role, "admin"),
        eq(users.emailVerified, true),
        isNull(users.disabledAt),
        inArray(sql`lower(${users.email})`, [...adminEmails]),
      ),
    )
    .returning({ id: users.id });
  if (!promoted.length) return false;
  await logAdminAction(db, { adminId: null, action: "set_role", targetUserId: userId, details: { from: "user", to: "admin", via: "ADMIN_EMAILS" } });
  return true;
}

/**
 * Called whenever a session is about to start, by any sign-in method (password, magic link,
 * Google, Apple). A disabled account gets no session; an ADMIN_EMAILS account gets its role.
 */
export async function onSessionStart(db: Db, userId: string, adminEmails: Set<string>): Promise<{ allowed: boolean }> {
  const [user] = await db.select({ disabledAt: users.disabledAt }).from(users).where(eq(users.id, userId));
  if (user?.disabledAt) return { allowed: false };
  await promoteListedAdmin(db, userId, adminEmails);
  return { allowed: true };
}

type Target = { id: string; email: string; role: string; disabledAt: Date | null };

/**
 * The rules for taking an account's admin powers or access away: not yourself, not an account
 * ADMIN_EMAILS names (its role would come straight back at the next sign-in), and never the last
 * enabled admin. Returns the reason, or null if it's allowed.
 */
async function checkCanRemoveAccess(
  tx: Executor,
  actorId: string | null,
  target: Target,
  what: "demote" | "disable" | "delete",
  adminEmails: Set<string>,
): Promise<string | null> {
  if (actorId === target.id) {
    return what === "delete" ? "You can't delete your own account here." : `You can't ${what} yourself.`;
  }
  if (target.role !== "admin") return null;
  if (adminEmails.has(target.email.toLowerCase())) {
    return `This account is listed in ADMIN_EMAILS. Remove it from that list first, or it would be an admin again at its next sign-in.`;
  }
  // Locking the admin rows makes two admins removing each other at once take turns.
  const others = await tx
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), isNull(users.disabledAt), ne(users.id, target.id)))
    .for("update");
  if (!others.length) return "There must always be at least one admin.";
  return null;
}

async function findTarget(tx: Executor, id: string): Promise<Target | null> {
  const [row] = await tx
    .select({ id: users.id, email: users.email, role: users.role, disabledAt: users.disabledAt })
    .from(users)
    .where(eq(users.id, id));
  return row ?? null;
}

const GONE = "That account no longer exists.";

async function endSessions(tx: Executor, userId: string): Promise<number> {
  return (await tx.delete(sessions).where(eq(sessions.userId, userId)).returning({ id: sessions.id })).length;
}

export function setRole(db: Db, actorId: string, targetId: string, role: string, adminEmails: Set<string>): Promise<Result> {
  return db.transaction(async (tx): Promise<Result> => {
    if (!ROLES.includes(role as Role)) return { ok: false, error: "Unknown role." };
    const target = await findTarget(tx, targetId);
    if (!target) return { ok: false, error: GONE };
    if (target.role === role) return { ok: true };
    let sessionsEnded = 0;
    if (role === "user") {
      const refusal = await checkCanRemoveAccess(tx, actorId, target, "demote", adminEmails);
      if (refusal) return { ok: false, error: refusal };
      // Lowering a role ends its sessions in the same step, so nothing signed in as admin lingers.
      sessionsEnded = await endSessions(tx, targetId);
    }
    await tx.update(users).set({ role }).where(eq(users.id, targetId));
    await logAdminAction(tx, {
      adminId: actorId,
      action: "set_role",
      targetUserId: targetId,
      details: { from: target.role, to: role, sessionsEnded },
    });
    return { ok: true };
  });
}

export function setDisabled(db: Db, actorId: string, targetId: string, disabled: boolean, adminEmails: Set<string>): Promise<Result> {
  return db.transaction(async (tx): Promise<Result> => {
    const target = await findTarget(tx, targetId);
    if (!target) return { ok: false, error: GONE };
    if (disabled === Boolean(target.disabledAt)) return { ok: true };
    if (!disabled) {
      await tx.update(users).set({ disabledAt: null }).where(eq(users.id, targetId));
      await logAdminAction(tx, { adminId: actorId, action: "enable", targetUserId: targetId });
      return { ok: true };
    }
    const refusal = await checkCanRemoveAccess(tx, actorId, target, "disable", adminEmails);
    if (refusal) return { ok: false, error: refusal };
    await tx.update(users).set({ disabledAt: new Date() }).where(eq(users.id, targetId));
    const sessionsEnded = await endSessions(tx, targetId);
    await logAdminAction(tx, { adminId: actorId, action: "disable", targetUserId: targetId, details: { sessionsEnded } });
    return { ok: true };
  });
}

export function signOutEverywhere(db: Db, actorId: string, targetId: string): Promise<Result<{ sessionsEnded: number }>> {
  return db.transaction(async (tx): Promise<Result<{ sessionsEnded: number }>> => {
    if (!(await findTarget(tx, targetId))) return { ok: false, error: GONE };
    const sessionsEnded = await endSessions(tx, targetId);
    await logAdminAction(tx, { adminId: actorId, action: "sign_out_everywhere", targetUserId: targetId, details: { sessionsEnded } });
    return { ok: true, sessionsEnded };
  });
}

/**
 * Deletes the account and, through the foreign keys, its sessions, sign-in methods, entries,
 * scores, shares, reactions on its entries, story interviews, recording rows and AI-call counts.
 * Returns what the caller must now delete from R2 (see deleteAccountFiles). Its calibration
 * votes go too; the activity log keeps its rows, which hold no foreign keys.
 */
export function deleteAccount(
  db: Db,
  actorId: string,
  targetId: string,
  adminEmails: Set<string>,
): Promise<Result<{ userId: string; shareIds: string[] }>> {
  return db.transaction(async (tx): Promise<Result<{ userId: string; shareIds: string[] }>> => {
    const target = await findTarget(tx, targetId);
    if (!target) return { ok: false, error: GONE };
    const refusal = await checkCanRemoveAccess(tx, actorId, target, "delete", adminEmails);
    if (refusal) return { ok: false, error: refusal };
    const removed = await removeAccount(tx, target, { adminId: actorId, action: "delete_account" });
    return { ok: true, ...removed };
  });
}

/**
 * Deletes the signed-in person's own account (You → Delete my account; Phase 7a user rights).
 * The same removal as deleteAccount. An admin can't leave the app without an admin, or remove an
 * account that ADMIN_EMAILS would bring straight back.
 */
export function deleteOwnAccount(db: Db, userId: string, adminEmails: Set<string>): Promise<Result<{ userId: string; shareIds: string[] }>> {
  return db.transaction(async (tx): Promise<Result<{ userId: string; shareIds: string[] }>> => {
    const target = await findTarget(tx, userId);
    if (!target) return { ok: false, error: GONE };
    // Checked as if someone else were removing this account, so the last-admin rule applies.
    const refusal = await checkCanRemoveAccess(tx, null, target, "delete", adminEmails);
    if (refusal) return { ok: false, error: refusal };
    const removed = await removeAccount(tx, target, { adminId: userId, action: "delete_own_account" });
    return { ok: true, ...removed };
  });
}

/** The removal itself, inside a transaction, after the caller's checks. Logged. */
async function removeAccount(
  tx: Executor & Pick<Db, "delete">,
  target: Target,
  log: { adminId: string; action: "delete_account" | "delete_own_account" },
): Promise<{ userId: string; shareIds: string[] }> {
  const targetId = target.id;
  const shareIds = (await tx.select({ id: shares.id }).from(shares).where(eq(shares.userId, targetId))).map((s) => s.id);
  // Friends who reacted are people without accounts; the ones who only reacted here go too.
  const ownEntries = tx.select({ id: entries.id }).from(entries).where(eq(entries.userId, targetId));
  const visitorIds = [
    ...new Set([
      ...(await tx.select({ id: reactions.visitorId }).from(reactions).where(inArray(reactions.entryId, ownEntries))),
      ...(await tx.select({ id: reactionNotes.visitorId }).from(reactionNotes).where(inArray(reactionNotes.entryId, ownEntries))),
    ].map((v) => v.id)),
  ];

  await logAdminAction(tx, {
    adminId: log.adminId,
    action: log.action,
    targetUserId: targetId,
    targetEmail: target.email,
    details: { shares: shareIds.length },
  });
  await tx.delete(users).where(eq(users.id, targetId));
  if (visitorIds.length) {
    await tx.delete(reactionVisitors).where(
      and(
        inArray(reactionVisitors.id, visitorIds),
        notExists(tx.select({ x: sql`1` }).from(reactions).where(eq(reactions.visitorId, reactionVisitors.id))),
        notExists(tx.select({ x: sql`1` }).from(reactionNotes).where(eq(reactionNotes.visitorId, reactionVisitors.id))),
      ),
    );
  }
  // Magic-link and password-reset tokens are keyed by the email address.
  await tx.delete(verifications).where(or(eq(verifications.identifier, target.email), eq(verifications.identifier, target.email.toLowerCase())));
  return { userId: targetId, shareIds };
}

type Bucket = Pick<R2Bucket, "list" | "delete">;

/**
 * Removes an account's files from R2: everything under entries/{userId}/ (display, thumb and share
 * photos, and the voice recordings under clips/) and each share's cached cards under shares/{id}/.
 */
export async function deleteAccountFiles(bucket: Bucket, userId: string, shareIds: string[]): Promise<number> {
  let deleted = 0;
  for (const prefix of [`entries/${userId}/`, ...shareIds.map((id) => `shares/${id}/`)]) {
    let cursor: string | undefined;
    do {
      const page = await bucket.list({ prefix, cursor });
      // R2 deletes at most 1000 keys per call, the same as a listing returns.
      if (page.objects.length) await bucket.delete(page.objects.map((o) => o.key));
      deleted += page.objects.length;
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
  }
  return deleted;
}
