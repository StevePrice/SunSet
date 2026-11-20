import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { getEntry } from "@/lib/entries";
import { getStorySettings } from "@/lib/settings";
import { listClips } from "@/lib/story/clips";
import { assembleSaid, originalWords } from "@/lib/story/prompts";
import { getSession } from "@/lib/story/sessions";
import { formatDuration } from "@/lib/story/voice";
import { BackLink } from "@/components/app-nav";
import { EditStoryForm } from "../entry-controls";
import { DeleteRecordingButton, WhatYouSaid } from "../recording";

export const metadata = { title: "Edit · Sunset Soul" };

// Edit (Phase 4e part 2): what moved off Entry Detail ("Edit the story", "Add more to my story",
// recordings, "What you said" / "What you wrote"). A stand-in until part 4 builds the story screen
// in edit mode (Build Spec 3.8, B3d). Like the story screens: Back at the top, no bottom bar.
export default async function EditEntryPage(props: PageProps<"/journal/[id]/edit">) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const found = await withDrizzle(async (db) => {
    const entry = await getEntry(db, user.id, id);
    if (!entry) return null;
    const [session, clips, settings] = await Promise.all([getSession(db, user.id, id), listClips(db, user.id, id), getStorySettings(db, user.id)]);
    const turns = session?.turns ?? [];
    const spoken = turns.some((t) => t.via === "spoken");
    return {
      entry,
      words: turns.length ? originalWords(turns) : null,
      said: spoken ? { saved: session?.said?.turns === turns.length ? session.said.text : null, raw: assembleSaid(turns, null) } : null,
      clips: clips.map((c) => ({ id: c.id, durationMs: c.durationMs })),
      aiHelp: settings?.aiStoryHelp ?? true,
    };
  });
  if (!found) notFound();
  const { entry, words, said, clips, aiHelp } = found;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pt-2 pb-8">
      <BackLink href={`/journal/${entry.id}`} label="Back" />
      <h1 className="font-serif text-title-1">Edit your story</h1>

      <EditStoryForm id={entry.id} story={entry.story} hasLocation={entry.location !== null} />

      {aiHelp && (
        <Link href={`/journal/${entry.id}/story`} className="inline-flex min-h-12 items-center self-start text-label underline">
          {words ? "Add more to my story" : "Get help telling it"}
        </Link>
      )}

      {/* Original words and recordings: private, never on the Share Page or share cards. */}
      {clips.length > 0 && (
        <section className="flex flex-col gap-3 rounded-ss-lg bg-surface-raised p-4" aria-labelledby="recordings">
          <h2 id="recordings" className="text-label font-bold">
            {clips.length === 1 ? "Your recording" : "Your recordings"}
          </h2>
          <p className="text-caption text-ink-muted">Only you can hear it.</p>
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
        </section>
      )}
      {said ? (
        <section className="flex flex-col gap-3 rounded-ss-lg bg-surface-raised p-4" aria-labelledby="said">
          <h2 id="said" className="text-label font-bold">
            What you said
          </h2>
          <WhatYouSaid entryId={entry.id} initial={said.saved} fallback={said.raw} />
        </section>
      ) : (
        words && (
          <details className="rounded-ss-lg bg-surface-raised p-4">
            <summary className="cursor-pointer text-label font-bold">What you wrote</summary>
            <p className="mt-3 whitespace-pre-wrap text-ink-story">{words}</p>
          </details>
        )
      )}
    </main>
  );
}
