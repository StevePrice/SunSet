import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { listEntries } from "@/lib/entries";
import { JOURNAL_VIEW_COOKIE, journalViewHref, parseJournalView, type JournalView } from "@/lib/journal-view";
import { reactionTotals } from "@/lib/reactions";
import { listSharedEntryIds } from "@/lib/shares";
import { ButtonLink } from "@/components/button";
import { Logo } from "@/components/logo";
import { LocalDate } from "@/components/local-date";
import { AppHeader, BottomBar } from "@/components/app-nav";
import { PhotoCard } from "@/components/photo-card";
import { PhotoGrid } from "./photo-grid";
import { RememberView } from "./remember-view";

export const metadata = { title: "Your Journal · Sunset Soul" };

export default async function JournalPage(props: PageProps<"/journal">) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  // First sign-in without a first name (accounts made by email link or a social sign-in with no
  // name): ask for it once, so the Share Page can say "[Name] shared a sunset with you".
  if (!user.name.trim()) redirect("/welcome");
  const view = parseJournalView((await props.searchParams).view, (await cookies()).get(JOURNAL_VIEW_COOKIE)?.value);
  const [entries, reactions, shared] = await withDrizzle((db) =>
    Promise.all([listEntries(db, user.id), reactionTotals(db, user.id), listSharedEntryIds(db, user.id)]),
  );
  const alt = (entry: (typeof entries)[number]) => entry.title ?? entry.story ?? "A sunset from your Journal";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pt-4 pb-8">
      <AppHeader />
      <div className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="font-serif text-title-1">Your Journal</h1>
          {entries.length > 0 && view === "photos" && (
            <p className="text-caption text-ink-muted">
              {entries.length} {entries.length === 1 ? "sunset" : "sunsets"}
            </p>
          )}
        </div>
        {entries.length > 0 && (
          <>
            <ViewToggle view={view} />
            <RememberView view={view} />
          </>
        )}
      </div>

      {entries.length === 0 ? (
        // Empty (Build Spec 3.4).
        <section className="flex flex-col items-center gap-4 rounded-ss-lg bg-surface-sunken px-6 py-10 text-center">
          <Logo layout="mark" width={72} />
          <h2 className="font-serif text-title-2">No sunsets yet</h2>
          <p>The next time one stops you in your tracks, save it here with the story behind it.</p>
          <ButtonLink href="/journal/new" variant="action" className="w-full max-w-sm">
            Save your first sunset
          </ButtonLink>
          <p className="text-caption text-ink-muted">A photo you took earlier works too.</p>
        </section>
      ) : view === "photos" ? (
        <PhotoGrid
          photos={entries.map((entry) => ({
            id: entry.id,
            takenAt: entry.takenAt.toISOString(),
            timeZone: entry.timeZone,
            alt: alt(entry),
          }))}
        />
      ) : (
        // Stories: inset photo cards, 32pt apart.
        <ul className="flex flex-col gap-8">
          {entries.map((entry) => {
            const count = reactions.get(entry.id) ?? 0;
            const place = entry.placeName;
            const reactionText = count ? `${count} ${count === 1 ? "reaction" : "reactions"}` : null;
            const status = shared.has(entry.id) ? ["Shared", reactionText].filter(Boolean).join(" · ") : reactionText;
            return (
              <li key={entry.id}>
                <Link href={`/journal/${entry.id}`} className="group flex flex-col gap-2">
                  <PhotoCard
                    src={`/api/photos/${entry.id}/display`}
                    alt={alt(entry)}
                    width={entry.photoWidth}
                    height={entry.photoHeight}
                    loading="lazy"
                    className="group-hover:opacity-90"
                  />
                  <span className="mt-1 text-caption text-ink-muted">
                    <LocalDate iso={entry.takenAt.toISOString()} timeZone={entry.timeZone} />
                    {place && ` · ${place}`}
                  </span>
                  {entry.title && <span className="font-serif text-title-3">{entry.title}</span>}
                  {entry.story && <span className="ss-story line-clamp-3 whitespace-pre-line text-ink-story">{entry.story}</span>}
                  {status && <span className="text-caption text-ink-muted">{status}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <BottomBar current="journal" />
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
