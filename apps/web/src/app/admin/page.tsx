import Link from "next/link";
import { listUsers, requireAdmin } from "@/lib/admin";
import { listActivity, type ActivityRow } from "@/lib/admin-log";
import { withDrizzle } from "@/lib/db";
import { LocalDate } from "@/components/local-date";
import { RescoreButton } from "./rescore-button";
import { UserActions } from "./user-actions";

// One plain sentence per logged action.
function describe(row: ActivityRow): string {
  const who = row.targetEmail ?? row.targetUserId ?? "an account";
  const d = row.details ?? {};
  switch (row.action) {
    case "view_journal":
      return `opened the Journal of ${who}`;
    case "view_entry":
      return `opened a sunset in the Journal of ${who}`;
    case "set_role":
      return d.via === "ADMIN_EMAILS"
        ? `${who} became admin through ADMIN_EMAILS`
        : `changed the role of ${who} from ${String(d.from)} to ${String(d.to)}`;
    case "disable":
      return `disabled ${who} and ended ${Number(d.sessionsEnded ?? 0)} sessions`;
    case "enable":
      return `enabled ${who}`;
    case "sign_out_everywhere":
      return `signed ${who} out everywhere (${Number(d.sessionsEnded ?? 0)} sessions)`;
    case "delete_account":
      return `deleted the account of ${who}`;
    case "rescore_all":
      return `queued ${Number(d.queued ?? 0)} sunsets for scoring`;
    default:
      return row.action;
  }
}

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const { users, activity } = await withDrizzle(async (db) => ({
    users: await listUsers(db),
    activity: await listActivity(db, 100),
  }));
  const entries = users.reduce((n, u) => n + u.entryCount, 0);

  return (
    <main className="flex flex-col gap-5">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-title-2 font-semibold">
          Users <span className="text-ink-muted">· {users.length} people, {entries} sunsets</span>
        </h1>
        <RescoreButton />
      </header>
      <p className="text-caption text-ink-muted">Opening someone&apos;s Journal, and every change below, is logged.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-caption">
          <thead className="text-ink-muted">
            <tr>
              <th className="py-2 pr-4 font-normal">Name</th>
              <th className="py-2 pr-4 font-normal">Email</th>
              <th className="py-2 pr-4 font-normal">Sunsets</th>
              <th className="py-2 pr-4 font-normal">Last sunset</th>
              <th className="py-2 pr-4 font-normal">Joined</th>
              <th className="py-2 pr-4 font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-divider align-top" data-email={u.email}>
                <td className="py-2 pr-4">
                  <Link href={`/admin/users/${u.id}`} className="underline">
                    {u.name.trim() || "(no name)"}
                  </Link>
                  {u.role === "admin" && <span className="ml-2 rounded bg-surface-raised px-1.5 text-caption">admin</span>}
                  {u.disabledAt && <span className="ml-2 rounded bg-surface-raised px-1.5 text-caption">disabled</span>}
                </td>
                <td className="py-2 pr-4">
                  {u.email}
                  {!u.emailVerified && <span className="ml-2 text-caption text-ink-muted">unverified</span>}
                </td>
                <td className="py-2 pr-4 tabular-nums">{u.entryCount}</td>
                <td className="py-2 pr-4">{u.lastEntryAt ? <LocalDate iso={new Date(u.lastEntryAt).toISOString()} /> : "–"}</td>
                <td className="py-2 pr-4">
                  <LocalDate iso={u.createdAt.toISOString()} />
                </td>
                <td className="py-2 pr-4">
                  <UserActions userId={u.id} role={u.role} disabled={Boolean(u.disabledAt)} isSelf={u.id === admin.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-title-3 font-semibold">Activity log</h2>
        {activity.length === 0 ? (
          <p className="text-caption text-ink-muted">Nothing yet.</p>
        ) : (
          <ul className="flex flex-col text-caption">
            {activity.map((row) => (
              <li key={row.id} className="flex flex-wrap gap-x-3 border-t border-divider py-2">
                <span className="text-ink-muted">
                  <LocalDate iso={row.createdAt.toISOString()} />
                </span>
                <span>
                  <strong>{row.adminEmail ?? (row.adminId ? "A deleted admin" : "The system")}</strong> {describe(row)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-caption text-ink-muted">The latest 100 actions.</p>
      </section>
    </main>
  );
}
