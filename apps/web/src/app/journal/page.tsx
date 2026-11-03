/* eslint-disable @next/next/no-img-element -- Journal photos are private and served by /api/photos. */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { listEntries } from "@/lib/entries";
import { LocalDate } from "@/components/local-date";

export const metadata = { title: "Your Journal · Sunset Soul" };

export default async function JournalPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const entries = await withDrizzle((db) => listEntries(db, user.id));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Your Journal</h1>
        <Link href="/journal/new" className="rounded-full bg-orange-600 px-5 py-2 font-medium text-white hover:bg-orange-700">
          New sunset
        </Link>
      </header>

      {entries.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-zinc-700">
          <p className="text-lg">No sunsets yet.</p>
          <p className="text-zinc-600 dark:text-zinc-400">The next time one stops you in your tracks, save it here.</p>
        </section>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Link href={`/journal/${entry.id}`} className="group relative flex flex-col gap-1">
                {entry.displayScore != null && (
                  <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-sm font-semibold text-white">
                    {entry.displayScore}
                  </span>
                )}
                <img
                  src={`/api/photos/${entry.id}/thumb`}
                  alt={entry.story ?? "A sunset from your Journal"}
                  className="aspect-square w-full rounded-xl object-cover group-hover:opacity-90"
                  loading="lazy"
                />
                <span className="text-sm font-medium">
                  <LocalDate iso={entry.takenAt.toISOString()} />
                </span>
                {entry.story && <span className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{entry.story}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <nav className="text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/account" className="underline">
          Account
        </Link>
      </nav>
    </main>
  );
}
