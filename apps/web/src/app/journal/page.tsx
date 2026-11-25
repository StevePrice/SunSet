import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { listEntries } from "@/lib/entries";
import { track } from "@/lib/analytics";
import {
  JOURNAL_SHOW_COOKIE,
  JOURNAL_VIEW_COOKIE,
  journalHref,
  parseJournalShow,
  parseJournalView,
  type JournalShow,
  type JournalView,
} from "@/lib/journal-view";
import { hasPeopleIn, nameChips, namesByEntry } from "@/lib/people";
import { reactionTotals } from "@/lib/reactions";
import { listSharedEntryIds } from "@/lib/shares";
import { ButtonLink } from "@/components/button";
import { Logo } from "@/components/logo";
import { LocalDate } from "@/components/local-date";
import { AppHeader, BottomBar } from "@/components/app-nav";
import { NameLink, WithLine } from "@/components/people";
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
  const params = await props.searchParams;
  const cookieStore = await cookies();
  const view = parseJournalView(params.view, cookieStore.get(JOURNAL_VIEW_COOKIE)?.value);
  const show = parseJournalShow(params.show, cookieStore.get(JOURNAL_SHOW_COOKIE)?.value);
  const [all, reactions, shared, names, chips] = await withDrizzle((db) =>
    Promise.all([
      listEntries(db, user.id),
      reactionTotals(db, user.id),
      listSharedEntryIds(db, user.id),
      namesByEntry(db, user.id),
      nameChips(db, user.id),
    ]),
  );
  // With people: the people check said yes, or there are names. Pure sunset: neither.
  const entries = show === "all" ? all : all.filter((e) => hasPeopleIn(e, names.get(e.id)) === (show === "people"));
  // Counts the filter being used (PRD 3: use of the With people filter), not plain visits.
  if (params.show === "people" || params.show === "pure") await track("journal_filtered", user.id, { show, view });
  const alt = (entry: (typeof entries)[number]) => entry.title ?? entry.story ?? "A sunset from your Journal";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pt-4 pb-8">
      <AppHeader />
      <div className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="font-serif text-title-1">Your Journal</h1>
          {all.length > 0 && view === "photos" && (
            <p className="text-caption text-ink-muted">
              {entries.length} {entries.length === 1 ? "sunset" : "sunsets"}
            </p>
          )}
        </div>
        {all.length > 0 && (
          <>
            <ViewToggle view={view} show={show} />
            <ShowFilter view={view} show={show} />
            <RememberView view={view} show={show} />
          </>
        )}
        {show === "people" && chips.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-caption text-ink-muted">Tap a name to see your sunsets together</p>
            <ul className="flex flex-wrap gap-3">
              {chips.map((chip) => (
                <li key={chip.name}>
                  <NameLink name={chip.name} count={chip.count} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {all.length > 0 && entries.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-ss-lg bg-surface-sunken px-6 py-10 text-center">
          <h2 className="font-serif text-title-2">{show === "people" ? "No sunsets with people yet" : "No pure sunsets yet"}</h2>
          <p>
            {show === "people"
              ? "When a photo has people in it, add their names on its story screen and it shows here."
              : "Sunsets with nobody in the photo show here."}
          </p>
          <ButtonLink href={journalHref(view, "all")}>See all your sunsets</ButtonLink>
        </section>
      ) : entries.length === 0 ? (
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
                  <WithLine names={names.get(entry.id) ?? []} />
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

// The two-part toggle under the title and the filter under it: links styled as segmented
// controls, full width, so both choices are in the URL. The selected segment is a raised surface,
// not the action colour (New sunset is this screen's one action button).
function Segments<T extends string>({
  label,
  segments,
  current,
  href,
  columns,
}: {
  label: string;
  segments: { value: T; label: string }[];
  current: T;
  href: (value: T) => string;
  columns: string;
}) {
  return (
    <nav aria-label={label} className={`grid rounded-ss-pill border border-border-subtle bg-surface-sunken p-1 ${columns}`}>
      {segments.map((segment) => {
        const selected = segment.value === current;
        return (
          <Link
            key={segment.value}
            href={href(segment.value)}
            aria-current={selected ? "page" : undefined}
            className={`inline-flex min-h-12 items-center justify-center rounded-ss-pill border px-3 text-center text-label leading-tight ${
              selected ? "border-border-subtle bg-surface-raised font-bold text-ink" : "border-transparent text-ink-muted"
            }`}
          >
            {segment.label}
          </Link>
        );
      })}
    </nav>
  );
}

function ViewToggle({ view, show }: { view: JournalView; show: JournalShow }) {
  return (
    <Segments<JournalView>
      label="Journal view"
      segments={[
        { value: "stories", label: "Stories" },
        { value: "photos", label: "Photos" },
      ]}
      current={view}
      href={(v) => journalHref(v, show)}
      columns="grid-cols-2"
    />
  );
}

// Build Spec 1.3: column widths 0.8fr · 1.2fr · 1.2fr.
function ShowFilter({ view, show }: { view: JournalView; show: JournalShow }) {
  return (
    <Segments<JournalShow>
      label="Show"
      segments={[
        { value: "all", label: "All" },
        { value: "people", label: "With people" },
        { value: "pure", label: "Pure sunset" },
      ]}
      current={show}
      href={(s) => journalHref(view, s)}
      columns="grid-cols-[0.8fr_1.2fr_1.2fr]"
    />
  );
}
