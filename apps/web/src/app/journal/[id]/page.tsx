/* eslint-disable @next/next/no-img-element -- Journal photos are private and served by /api/photos. */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { getEntry } from "@/lib/entries";
import { getScore } from "@/lib/scores";
import { getShareForEntry } from "@/lib/shares";
import { originalWords } from "@/lib/story/prompts";
import { getSession } from "@/lib/story/sessions";
import { ScoreCard } from "@/components/score-card";
import { LocalDate } from "@/components/local-date";
import { formatLocation } from "@/lib/format";
import { DeleteEntryButton, EditStoryForm } from "./entry-controls";
import { SharePanel } from "./share-panel";

export const metadata = { title: "Sunset · Sunset Soul" };

export default async function EntryPage(props: PageProps<"/journal/[id]">) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const found = await withDrizzle(async (db) => {
    const entry = await getEntry(db, user.id, id);
    if (!entry) return null;
    const [score, share, session] = await Promise.all([
      getScore(db, user.id, id),
      getShareForEntry(db, user.id, id),
      getSession(db, user.id, id),
    ]);
    return { entry, score, share, words: session?.turns.length ? originalWords(session.turns) : null };
  });
  if (!found) notFound();
  const { entry, score, share, words } = found;
  const { env } = await getCloudflareContext({ async: true });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-8">
      <Link href="/journal" className="text-sm underline">
        ← Your Journal
      </Link>
      <img
        src={`/api/photos/${entry.id}/display`}
        alt={entry.story ?? "Your sunset"}
        width={entry.photoWidth}
        height={entry.photoHeight}
        className="h-auto w-full rounded-2xl"
      />
      <div className="flex flex-col gap-1">
        {entry.title && <h1 className="text-3xl font-semibold tracking-tight">{entry.title}</h1>}
        <p className={entry.title ? "text-zinc-600 dark:text-zinc-400" : "text-2xl font-semibold"}>
          <LocalDate iso={entry.takenAt.toISOString()} />
        </p>
        {entry.location && <p className="text-sm text-zinc-600 dark:text-zinc-400">{formatLocation(entry.location)}</p>}
      </div>
      <EditStoryForm id={entry.id} story={entry.story} hasLocation={entry.location !== null} />
      <Link
        href={`/journal/${entry.id}/story`}
        className={
          words
            ? "self-start text-sm underline"
            : "self-start rounded-lg bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700"
        }
      >
        {words ? "Add more to my story" : "Tell its story"}
      </Link>
      {words && (
        <details className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <summary className="cursor-pointer text-sm font-medium">What you wrote</summary>
          <p className="mt-3 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{words}</p>
        </details>
      )}
      <ScoreCard entryId={entry.id} initial={score ?? { status: "none" }} />
      <SharePanel entryId={entry.id} initial={share && { url: `${env.BETTER_AUTH_URL}/s/${share.id}`, place: share.place }} />
      <DeleteEntryButton id={entry.id} />
    </main>
  );
}
