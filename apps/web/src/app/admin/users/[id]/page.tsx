import Link from "next/link";
import { notFound } from "next/navigation";
import { getUser, logAdminView, requireAdmin } from "@/lib/admin";
import { withDrizzle } from "@/lib/db";
import { listEntries } from "@/lib/entries";
import { LocalDate } from "@/components/local-date";
import { PhotoCard } from "@/components/photo-card";

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
      <Link href="/admin" className="text-caption underline">
        ← Users
      </Link>
      <header>
        <h1 className="text-title-2 font-semibold">{user.name.trim() || "(no name)"}&apos;s Journal</h1>
        <p className="text-caption text-ink-muted">
          {user.email} · joined <LocalDate iso={user.createdAt.toISOString()} /> · {entries.length} sunsets
        </p>
      </header>
      {entries.length === 0 ? (
        <p className="text-ink-muted">No sunsets yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Link href={`/admin/entries/${entry.id}`} className="group relative flex flex-col gap-1">
                <PhotoCard
                  src={`/api/admin/photos/${entry.id}/thumb`}
                  alt={entry.title ?? entry.story ?? "A sunset"}
                  score={entry.displayScore}
                  square
                  className="group-hover:opacity-90"
                  loading="lazy"
                />
                <span className="text-caption font-bold">{entry.title ?? <LocalDate iso={entry.takenAt.toISOString()} />}</span>
                {entry.story && <span className="line-clamp-2 text-caption text-ink-muted">{entry.story}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
