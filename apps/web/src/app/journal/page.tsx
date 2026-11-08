import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { listEntries } from "@/lib/entries";
import { journalViewHref, parseJournalView, type JournalView } from "@/lib/journal-view";
import { reactionTotals } from "@/lib/reactions";
import { ButtonLink } from "@/components/button";
import { LocalDate } from "@/components/local-date";
import { AppHeader } from "@/components/logo";
import { PhotoCard } from "@/components/photo-card";
import { PhotoGrid } from "./photo-grid";

export const metadata = { title: "Your Journal · Sunset Soul" };

export default async function JournalPage(props: PageProps<"/journal">) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const view = parseJournalView((await props.searchParams).view);
  const [entries, reactions] = await withDrizzle((db) => Promise.all([listEntries(db, user.id), reactionTotals(db, user.id)]));
  const alt = (entry: (typeof entries)[number]) => entry.title ?? entry.story ?? "A sunset from your Journal";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <AppHeader />
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-serif text-title-1">Your Journal</h1>
          <ButtonLink href="/journal/new" variant="action">
            New sunset
          </ButtonLink>
        </div>
        {entries.length > 0 && <ViewToggle view={view} />}
      </div>

      {entries.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-ss-lg bg-surface-sunken px-6 py-10 text-center">
          <p className="font-serif text-title-3">No sunsets yet.</p>
          <p className="text-ink-muted">The next time one stops you in your tracks, save it here.</p>
        </section>
      ) : view === "photos" ? (
        <PhotoGrid
          photos={entries.map((entry) => ({
            id: entry.id,
            takenAt: entry.takenAt.toISOString(),
            score: entry.displayScore,
            alt: alt(entry),
          }))}
        />
      ) : (
        // Stories: inset photo cards, 32pt apart.
        <ul className="flex flex-col gap-8">
          {entries.map((entry) => {
            const count = reactions.get(entry.id);
            return (
              <li key={entry.id}>
                <Link href={`/journal/${entry.id}`} className="group flex flex-col gap-2">
                  <PhotoCard
                    src={`/api/photos/${entry.id}/display`}
                    alt={alt(entry)}
                    width={entry.photoWidth}
                    height={entry.photoHeight}
                    score={entry.displayScore}
                    loading="lazy"
                    className="group-hover:opacity-90"
                  />
                  <span className="mt-1 text-label text-ink-muted">
                    <LocalDate iso={entry.takenAt.toISOString()} />
                  </span>
                  {entry.title && <span className="font-serif text-title-3">{entry.title}</span>}
                  {entry.story && <span className="line-clamp-3 whitespace-pre-line text-ink-story">{entry.story}</span>}
                  {count ? (
                    <span className="text-caption text-ink-muted">
                      {count} {count === 1 ? "reaction" : "reactions"} from friends
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
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

// The two-part toggle under the title: two links styled as a segmented control, so the view is
// in the URL. The selected segment is a raised surface, not the action colour (New sunset is this
// screen's one action button).
function ViewToggle({ view }: { view: JournalView }) {
  const segments: { view: JournalView; label: string }[] = [
    { view: "stories", label: "Stories" },
    { view: "photos", label: "All photos" },
  ];
  return (
    <nav aria-label="Journal view" className="flex self-start rounded-ss-pill bg-surface-sunken p-1">
      {segments.map((segment) => {
        const selected = segment.view === view;
        return (
          <Link
            key={segment.view}
            href={journalViewHref(segment.view)}
            aria-current={selected ? "page" : undefined}
            className={`inline-flex min-h-12 items-center rounded-ss-pill border px-5 text-label font-bold ${
              selected ? "border-border-subtle bg-surface-raised text-ink" : "border-transparent text-ink-muted"
            }`}
          >
            {segment.label}
          </Link>
        );
      })}
    </nav>
  );
}
