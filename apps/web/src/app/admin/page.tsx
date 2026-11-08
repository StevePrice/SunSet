import Link from "next/link";
import { listUsers, requireAdmin } from "@/lib/admin";
import { withDrizzle } from "@/lib/db";
import { LocalDate } from "@/components/local-date";
import { RescoreButton } from "./rescore-button";

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await withDrizzle((db) => listUsers(db));
  const entries = users.reduce((n, u) => n + u.entryCount, 0);

  return (
    <main className="flex flex-col gap-5">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-title-2 font-semibold">
          Users <span className="text-ink-muted">· {users.length} people, {entries} sunsets</span>
        </h1>
        <RescoreButton />
      </header>
      <p className="text-caption text-ink-muted">Opening someone&apos;s Journal is logged.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-caption">
          <thead className="text-ink-muted">
            <tr>
              <th className="py-2 pr-4 font-normal">Name</th>
              <th className="py-2 pr-4 font-normal">Email</th>
              <th className="py-2 pr-4 font-normal">Sunsets</th>
              <th className="py-2 pr-4 font-normal">Last sunset</th>
              <th className="py-2 pr-4 font-normal">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-divider">
                <td className="py-2 pr-4">
                  <Link href={`/admin/users/${u.id}`} className="underline">
                    {u.name.trim() || "(no name)"}
                  </Link>
                  {u.role === "admin" && <span className="ml-2 rounded bg-surface-raised px-1.5 text-caption">admin</span>}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
