// Admin access. Admins can read every Journal; each view, and every other admin action, is logged
// in admin_log. Account changes (role, disable, delete) are in user-admin.ts.
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { SCORER_VERSION } from "@sunset/scoring";
import { and, count, desc, eq, isNull, max } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { entries, entryScores, users } from "@/db/schema";
import { logAdminAction } from "@/lib/admin-log";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle, type Db } from "@/lib/db";
import { parseAdminEmails, promoteListedAdmin } from "@/lib/user-admin";

export async function isAdmin(db: Db, userId: string): Promise<boolean> {
  const [row] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  return row?.role === "admin";
}

/** The signed-in admin. Anyone else gets a 404, so the admin pages don't reveal they exist. */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const { env } = await getCloudflareContext({ async: true });
  const admin = await withDrizzle(async (db) => {
    // A session that began before ADMIN_EMAILS listed this email still gets the role.
    await promoteListedAdmin(db, user.id, parseAdminEmails(env.ADMIN_EMAILS));
    return isAdmin(db, user.id);
  });
  if (!admin) notFound();
  return user;
}

export async function logAdminView(db: Db, adminId: string, viewedUserId: string, entryId: string | null = null) {
  if (adminId === viewedUserId) return;
  await logAdminAction(db, { adminId, action: entryId ? "view_entry" : "view_journal", targetUserId: viewedUserId, entryId });
}

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  disabledAt: Date | null;
  emailVerified: boolean;
  createdAt: Date;
  entryCount: number;
  lastEntryAt: Date | null;
};

export async function listUsers(db: Db): Promise<AdminUserRow[]> {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      disabledAt: users.disabledAt,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
      entryCount: count(entries.id),
      lastEntryAt: max(entries.createdAt),
    })
    .from(users)
    .leftJoin(entries, eq(entries.userId, users.id))
    .groupBy(users.id)
    .orderBy(desc(max(entries.createdAt)), desc(users.createdAt));
}

export async function getUser(db: Db, id: string) {
  const [row] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, id));
  return row ?? null;
}

export async function getEntryOwner(db: Db, entryId: string): Promise<string | null> {
  const [row] = await db.select({ userId: entries.userId }).from(entries).where(eq(entries.id, entryId));
  return row?.userId ?? null;
}

/** Queues every entry that has no score from the current scorer version. Returns how many. */
export async function queueRescoreAll(db: Db, queue: Queue<{ entryId: string }>): Promise<number> {
  const missing = await db
    .select({ id: entries.id })
    .from(entries)
    .leftJoin(entryScores, and(eq(entryScores.entryId, entries.id), eq(entryScores.scorerVersion, SCORER_VERSION)))
    .where(isNull(entryScores.entryId));
  if (!missing.length) return 0;
  await db
    .insert(entryScores)
    .values(missing.map((e) => ({ entryId: e.id, scorerVersion: SCORER_VERSION, status: "pending" })))
    .onConflictDoNothing();
  for (let i = 0; i < missing.length; i += 100) {
    await queue.sendBatch(missing.slice(i, i + 100).map((e) => ({ body: { entryId: e.id } })));
  }
  return missing.length;
}
