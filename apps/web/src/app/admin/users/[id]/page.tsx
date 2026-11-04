/* eslint-disable @next/next/no-img-element -- photos are private and served by /api/admin/photos. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getUser, logAdminView, requireAdmin } from "@/lib/admin";
import { withDrizzle } from "@/lib/db";
import { listEntries } from "@/lib/entries";
import { LocalDate } from "@/components/local-date";

export default async function AdminUserPage(props: PageProps<"/admin/users/[id]">) {
  const { id } = await props.params;
  const admin = await requireAdmin();
  const found = await withDrizzle(async (db) => {
    const user = await getUser(db, id);
    if (!user) return null;
    await logAdminView(db, admin.id, id);
    return { user, entries: await listEntries(db, id) };
  });
  if (!found) notFound();
  const { user, entries } = found;

  return (
    <main className="flex flex-col gap-5">
      <Link href="/admin" className="text-sm underline">
        ← Users
      </Link>
      <header>
        <h1 className="text-2xl font-semibold">{user.name.trim() || "(no name)"}&apos;s Journal</h1>
        <p className="text-sm text-zinc-500">
          {user.email} · joined <LocalDate iso={user.createdAt.toISOString()} /> · {entries.length} sunsets
        </p>
      </header>
      {entries.length === 0 ? (
        <p className="text-zinc-500">No sunsets yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Link href={`/admin/entries/${entry.id}`} className="group relative flex flex-col gap-1">
                {entry.displayScore != null && (
                  <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-sm font-semibold text-white">
                    {entry.displayScore}
                  </span>
                )}
                <img
                  src={`/api/admin/photos/${entry.id}/thumb`}
                  alt={entry.title ?? entry.story ?? "A sunset"}
                  className="aspect-square w-full rounded-xl object-cover group-hover:opacity-90"
                  loading="lazy"
                />
                <span className="text-sm font-medium">{entry.title ?? <LocalDate iso={entry.takenAt.toISOString()} />}</span>
                {entry.story && <span className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{entry.story}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
