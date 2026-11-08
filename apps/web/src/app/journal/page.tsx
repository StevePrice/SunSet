import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { listEntries } from "@/lib/entries";
import { reactionTotals } from "@/lib/reactions";
import { ButtonLink } from "@/components/button";
import { LocalDate } from "@/components/local-date";
import { AppHeader } from "@/components/logo";
import { PhotoCard } from "@/components/photo-card";

export const metadata = { title: "Your Journal · Sunset Soul" };

export default async function JournalPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const [entries, reactions] = await withDrizzle((db) => Promise.all([listEntries(db, user.id), reactionTotals(db, user.id)]));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <AppHeader />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-title-1">Your Journal</h1>
        <ButtonLink href="/journal/new" variant="action">
          New sunset
        </ButtonLink>
      </div>

      {entries.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-ss-lg bg-surface-sunken px-6 py-10 text-center">
          <p className="font-serif text-title-3">No sunsets yet.</p>
          <p className="text-ink-muted">The next time one stops you in your tracks, save it here.</p>
        </section>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Link href={`/journal/${entry.id}`} className="group relative flex flex-col gap-1">
                <PhotoCard
                  src={`/api/photos/${entry.id}/thumb`}
                  alt={entry.story ?? "A sunset from your Journal"}
                  score={entry.displayScore}
                  square
                  loading="lazy"
                  className="group-hover:opacity-90"
                />
                <span className="text-label font-bold">
                  <LocalDate iso={entry.takenAt.toISOString()} />
                </span>
                {reactions.has(entry.id) && (
                  <span className="text-caption text-ink-muted">
                    {reactions.get(entry.id)} {reactions.get(entry.id) === 1 ? "reaction" : "reactions"} from friends
                  </span>
                )}
                {entry.story && <span className="line-clamp-2 text-caption text-ink-muted">{entry.story}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <nav className="text-label">
        <Link href="/account" className="underline">
          Account
        </Link>
      </nav>
    </main>
  );
}
