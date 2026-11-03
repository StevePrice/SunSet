/* eslint-disable @next/next/no-img-element -- Journal photos are private and served by /api/photos. */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { getEntry } from "@/lib/entries";
import { getScore } from "@/lib/scores";
import { getShareForEntry } from "@/lib/shares";
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
    const [score, share] = await Promise.all([getScore(db, user.id, id), getShareForEntry(db, user.id, id)]);
    return { entry, score, share };
  });
  if (!found) notFound();
  const { entry, score, share } = found;
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
        <h1 className="text-2xl font-semibold">
          <LocalDate iso={entry.takenAt.toISOString()} />
        </h1>
        {entry.location && <p className="text-sm text-zinc-600 dark:text-zinc-400">{formatLocation(entry.location)}</p>}
      </div>
      <ScoreCard entryId={entry.id} initial={score ?? { status: "none" }} />
      <EditStoryForm id={entry.id} story={entry.story} hasLocation={entry.location !== null} />
      <SharePanel entryId={entry.id} initial={share && { url: `${env.BETTER_AUTH_URL}/s/${share.id}`, place: share.place }} />
      <DeleteEntryButton id={entry.id} />
    </main>
  );
}
