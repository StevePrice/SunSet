import { getCloudflareContext } from "@opennextjs/cloudflare";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { getEntry } from "@/lib/entries";
import { formatLocation } from "@/lib/format";
import { reactionTotals } from "@/lib/reactions";
import { getScore } from "@/lib/scores";
import { getShareForEntry } from "@/lib/shares";
import { listClips } from "@/lib/story/clips";
import { formatDuration } from "@/lib/story/voice";
import { AppHeader, BottomBar } from "@/components/app-nav";
import { buttonClass } from "@/components/button";
import { LocalDate } from "@/components/local-date";
import { PhotoCard } from "@/components/photo-card";
import { ScoreDetails, ScoreProvider, WowLine } from "@/components/score-card";
import { DeleteEntryButton } from "./entry-controls";
import { HearYourVoice } from "./recording";
import { ShareButton } from "./share-button";

export const metadata = { title: "Sunset · Sunset Soul" };

// Entry Detail (Phase 4e, Build Spec 3.6), top to bottom: photo, title, date and place, Wow line,
// story (or Add your story), "Hear it in your own voice", Edit, Share, the Afterglow row, Score
// details, Delete. Editing the story, recordings and "What you said" are on the Edit page; the
// link settings are in Afterglow.
export default async function EntryPage(props: PageProps<"/journal/[id]">) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const found = await withDrizzle(async (db) => {
    const entry = await getEntry(db, user.id, id);
    if (!entry) return null;
    const [score, share, totals, clips] = await Promise.all([
      getScore(db, user.id, id),
      getShareForEntry(db, user.id, id),
      reactionTotals(db, user.id),
      listClips(db, user.id, id),
    ]);
    return {
      entry,
      score,
      share,
      reactionCount: totals.get(id) ?? 0,
      clips: clips.map((c) => ({ id: c.id, durationMs: c.durationMs })),
    };
  });
  if (!found) notFound();
  const { entry, score, share, reactionCount, clips } = found;
  const { env } = await getCloudflareContext({ async: true });
  const place = entry.location && formatLocation(entry.location);
  const afterglowStatus = !share
    ? "Not shared"
    : reactionCount === 0
      ? "No reactions yet"
      : `Shared · ${reactionCount} ${reactionCount === 1 ? "reaction" : "reactions"}`;

  return (
    <main className="flex w-full flex-1 flex-col pb-8">
      {/* The header, then the photo edge to edge: the only full-bleed photo in the app. */}
      <div className="mx-auto w-full max-w-2xl px-4 pt-2 pb-2">
        <AppHeader back={{ href: "/journal", label: "Journal" }} />
      </div>
      <PhotoCard
        src={`/api/photos/${entry.id}/display`}
        alt={entry.story ?? "Your sunset"}
        width={entry.photoWidth}
        height={entry.photoHeight}
        bleed
      />
      {/* The photo and story lead; the score is a quiet detail: the Wow line under the date and the
          Score details row near the bottom. */}
      <ScoreProvider entryId={entry.id} initial={score ?? { status: "none" }}>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pt-5">
          <div className="flex flex-col gap-1">
            {entry.title ? (
              <>
                <h1 className="font-serif text-title-2">{entry.title}</h1>
                <p className="text-caption text-ink-muted">
                  <LocalDate iso={entry.takenAt.toISOString()} />
                  {place && ` · ${place}`}
                </p>
              </>
            ) : (
              <>
                <h1 className="font-serif text-title-2">
                  <LocalDate iso={entry.takenAt.toISOString()} />
                </h1>
                {place && <p className="text-caption text-ink-muted">{place}</p>}
              </>
            )}
            <WowLine />
          </div>

          {entry.story ? (
            <p className="ss-story whitespace-pre-wrap text-ink-story">{entry.story}</p>
          ) : (
            <Link href={`/journal/${entry.id}/story`} className={buttonClass("secondary", "self-start")}>
              Add your story
            </Link>
          )}

          {clips.length > 0 && (
            <HearYourVoice
              clips={clips.map((c) => `/api/clips/${c.id}`)}
              title={`Hear it in your own voice · ${formatDuration(clips.reduce((total, c) => total + c.durationMs, 0))}`}
              subtitle="Only you can hear it"
            />
          )}

          <Link href={`/journal/${entry.id}/edit`} className="inline-flex min-h-12 items-center gap-2 self-start text-label underline">
            <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z" />
              <path d="m15 5 4 4" />
            </svg>
            Edit
          </Link>

          <ShareButton entryId={entry.id} initialUrl={share && `${env.BETTER_AUTH_URL}/s/${share.id}`} />

          <Link
            href={`/journal/${entry.id}/afterglow`}
            className="flex min-h-12 items-center justify-between gap-3 rounded-ss-lg bg-surface-raised px-5 py-3"
          >
            <span className="flex flex-col">
              <span className="font-serif text-title-3">Afterglow</span>
              <span className="text-caption text-ink-muted">{afterglowStatus}</span>
            </span>
            <span aria-hidden className="text-ink-muted">
              ›
            </span>
          </Link>

          <ScoreDetails />
          <DeleteEntryButton id={entry.id} />
        </div>
      </ScoreProvider>
      <BottomBar current="journal" />
    </main>
  );
}
