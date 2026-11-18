// The activity log: one row per admin action. Kept apart from admin.ts so account changes
// (user-admin.ts) can write to it without importing the page-level admin helpers.
import { desc, eq } from "drizzle-orm";
import { adminLog, users } from "@/db/schema";
import type { Db } from "@/lib/db";

// Anything that reads and writes through the db handle, so a transaction works too.
export type Executor = Pick<Db, "select" | "insert" | "update" | "delete">;

export type AdminAction =
  | "view_journal"
  | "view_entry"
  | "set_role"
  | "disable"
  | "enable"
  | "sign_out_everywhere"
  | "delete_account"
  | "rescore_all";

/** Adds a row to the activity log. `adminId` is null when the system acted (ADMIN_EMAILS). */
export async function logAdminAction(
  db: Executor,
  entry: {
    adminId: string | null;
    action: AdminAction;
    targetUserId?: string | null;
    // Pass it when the account is about to disappear; otherwise it's looked up.
    targetEmail?: string | null;
    entryId?: string | null;
    details?: Record<string, unknown>;
  },
) {
  const emailOf = async (id: string | null | undefined) =>
    id ? ((await db.select({ email: users.email }).from(users).where(eq(users.id, id)))[0]?.email ?? null) : null;
  await db.insert(adminLog).values({
    id: crypto.randomUUID(),
    adminId: entry.adminId,
    adminEmail: await emailOf(entry.adminId),
    action: entry.action,
    targetUserId: entry.targetUserId ?? null,
    targetEmail: entry.targetEmail !== undefined ? entry.targetEmail : await emailOf(entry.targetUserId),
    entryId: entry.entryId ?? null,
    details: entry.details ?? null,
  });
}

export type ActivityRow = {
  id: string;
  adminId: string | null;
  adminEmail: string | null;
  action: string;
  targetUserId: string | null;
  targetEmail: string | null;
  entryId: string | null;
  details: Record<string, unknown> | null;
  createdAt: Date;
};

export function listActivity(db: Db, limit = 100): Promise<ActivityRow[]> {
  return db.select().from(adminLog).orderBy(desc(adminLog.createdAt)).limit(limit);
}
