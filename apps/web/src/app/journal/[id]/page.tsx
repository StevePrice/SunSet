import { getCloudflareContext } from "@opennextjs/cloudflare";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { getEntry } from "@/lib/entries";
import { reactionTotals } from "@/lib/reactions";
import { getScore } from "@/lib/scores";
import { getShareForEntry } from "@/lib/shares";
import { getStorySettings } from "@/lib/settings";
import { listClips } from "@/lib/story/clips";
import { assembleSaid, originalWords } from "@/lib/story/prompts";
import { getSession } from "@/lib/story/sessions";
import { formatDuration } from "@/lib/story/voice";
import { buttonClass } from "@/components/button";
import { AppHeader } from "@/components/logo";
import { PhotoCard } from "@/components/photo-card";
import { ScoreCard } from "@/components/score-card";
import { LocalDate } from "@/components/local-date";
import { formatLocation } from "@/lib/format";
import { DeleteEntryButton, EditStoryForm } from "./entry-controls";
import { DeleteRecordingButton, WhatYouSaid } from "./recording";
import { SharePanel } from "./share-panel";

export const metadata = { title: "Sunset · Sunset Soul" };

export default async function EntryPage(props: PageProps<"/journal/[id]">) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const found = await withDrizzle(async (db) => {
    const entry = await getEntry(db, user.id, id);
    if (!entry) return null;
    const [score, share, session, totals, clips, settings] = await Promise.all([
      getScore(db, user.id, id),
      getShareForEntry(db, user.id, id),
      getSession(db, user.id, id),
      reactionTotals(db, user.id),
      listClips(db, user.id, id),
      getStorySettings(db, user.id),
    ]);
    const turns = session?.turns ?? [];
    const spoken = turns.some((t) => t.via === "spoken");
    return {
      entry,
      score,
      share,
      reactionCount: totals.get(id) ?? 0,
      words: turns.length ? originalWords(turns) : null,
      // "What you said" for stories with any spoken answer: the saved clean-up if it's up to date.
      said: spoken ? { saved: session?.said?.turns === turns.length ? session.said.text : null, raw: assembleSaid(turns, null) } : null,
      clips: clips.map((c) => ({ id: c.id, durationMs: c.durationMs })),
      aiHelp: settings?.aiStoryHelp ?? true,
    };
  });
  if (!found) notFound();
  const { entry, score, share, reactionCount, words, said, clips, aiHelp } = found;
  const { env } = await getCloudflareContext({ async: true });

  return (
    <main className="flex w-full flex-1 flex-col pb-8">
      {/* A compact header, then the photo edge to edge: the only full-bleed photo in the app. */}
      <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-x-4 px-4 pt-2 pb-1">
        <AppHeader />
        <Link href="/journal" className="inline-flex min-h-12 items-center text-label underline">
          ← Your Journal
        </Link>
      </div>
      <PhotoCard
        src={`/api/photos/${entry.id}/display`}
        alt={entry.story ?? "Your sunset"}
        width={entry.photoWidth}
        height={entry.photoHeight}
        bleed
      />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pt-5">
        <div className="flex flex-col gap-1">
          {entry.title && <h1 className="font-serif text-title-2">{entry.title}</h1>}
          <p className={entry.title ? "text-ink-muted" : "text-title-2 font-semibold"}>
            <LocalDate iso={entry.takenAt.toISOString()} />
          </p>
          {entry.location && <p className="text-caption text-ink-muted">{formatLocation(entry.location)}</p>}
        </div>
        <EditStoryForm id={entry.id} story={entry.story} hasLocation={entry.location !== null} />
        {aiHelp && (
          <Link
            href={`/journal/${entry.id}/story`}
            className={
              words
                ? "inline-flex min-h-12 items-center self-start text-label underline"
                : buttonClass("secondary", "self-start")
            }
          >
            {words ? "Add more to my story" : "Tell its story"}
          </Link>
        )}
        {/* Original words and recordings: private, never on the Share Page or share cards. */}
        {(said || clips.length > 0) && (
          <section className="flex flex-col gap-3 rounded-ss-lg bg-surface-raised p-4" aria-label="Your recording and words">
            {clips.length > 0 && (
              <>
                <h2 className="text-label font-bold">{clips.length === 1 ? "Your recording" : "Your recordings"}</h2>
                <ol className="flex flex-col gap-2">
                  {clips.map((clip, i) => (
                    <li key={clip.id} className="flex flex-col gap-1">
                      {clips.length > 1 && (
                        <span className="text-caption text-ink-muted">
                          Part {i + 1} · {formatDuration(clip.durationMs)}
                        </span>
                      )}
                      <audio controls preload="metadata" src={`/api/clips/${clip.id}`} className="w-full">
                        Your browser can&apos;t play this recording.
                      </audio>
                    </li>
                  ))}
                </ol>
                <DeleteRecordingButton entryId={entry.id} count={clips.length} />
              </>
            )}
            {said ? (
              <>
                <h2 className="text-label font-bold">What you said</h2>
                <WhatYouSaid entryId={entry.id} initial={said.saved} fallback={said.raw} />
              </>
            ) : (
              words && (
                <details>
                  <summary className="cursor-pointer text-label font-bold">What you wrote</summary>
                  <p className="mt-3 whitespace-pre-wrap text-ink-story">{words}</p>
                </details>
              )
            )}
          </section>
        )}
        {!said && clips.length === 0 && words && (
          <details className="rounded-ss-lg bg-surface-raised p-4">
            <summary className="cursor-pointer text-label font-bold">What you wrote</summary>
            <p className="mt-3 whitespace-pre-wrap text-ink-story">{words}</p>
          </details>
        )}
        <ScoreCard entryId={entry.id} initial={score ?? { status: "none" }} />
        {(share || reactionCount > 0) && (
          <Link
            href={`/journal/${entry.id}/afterglow`}
            className="flex min-h-12 flex-wrap items-center justify-between gap-2 rounded-ss-lg bg-surface-raised px-5 py-3"
          >
            <span className="font-serif text-title-3">Afterglow</span>
            <span className="text-label text-ink-muted">
              {reactionCount === 0 ? "No reactions yet" : `${reactionCount} ${reactionCount === 1 ? "reaction" : "reactions"} from friends`} →
            </span>
          </Link>
        )}
        <SharePanel entryId={entry.id} initial={share && { url: `${env.BETTER_AUTH_URL}/s/${share.id}`, place: share.place }} />
        <DeleteEntryButton id={entry.id} />
      </div>
    </main>
  );
}
