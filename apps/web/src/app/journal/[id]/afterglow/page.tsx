/* eslint-disable @next/next/no-img-element -- Journal photos are private and served by /api/photos. */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { getEntry } from "@/lib/entries";
import { REACTION_KINDS, REACTION_LABELS } from "@/lib/reaction-input";
import { getAfterglow } from "@/lib/reactions";
import { getShareForEntry } from "@/lib/shares";
import { LocalDate } from "@/components/local-date";
import { SharePanel } from "../share-panel";
import { RemoveButton } from "./remove-button";

export const metadata = { title: "Afterglow · Sunset Soul" };

// What friends sent for one entry (PRD 6.9b): totals, who reacted, their notes. Owner only.
export default async function AfterglowPage(props: PageProps<"/journal/[id]/afterglow">) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const found = await withDrizzle(async (db) => {
    const entry = await getEntry(db, user.id, id);
    if (!entry) return null;
    const [afterglow, share] = await Promise.all([getAfterglow(db, user.id, id), getShareForEntry(db, user.id, id)]);
    return afterglow && { entry, afterglow, share };
  });
  if (!found) notFound();
  const { entry, afterglow, share } = found;
  const { env } = await getCloudflareContext({ async: true });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <Link href={`/journal/${entry.id}`} className="text-base underline">
        ← Back to this sunset
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-4xl font-semibold tracking-tight">Afterglow</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">from your friends</p>
      </header>

      <div className="flex items-center gap-4">
        <img src={`/api/photos/${entry.id}/thumb`} alt="" className="size-20 rounded-lg object-cover" />
        <p className="text-xl font-semibold">{entry.title ?? <LocalDate iso={entry.takenAt.toISOString()} />}</p>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        {REACTION_KINDS.map((kind) => (
          <div key={kind} className="flex flex-col-reverse items-center gap-1 rounded-2xl border border-zinc-300 p-3 text-center dark:border-zinc-700">
            <dt className="text-base">{REACTION_LABELS[kind]}</dt>
            <dd className="text-3xl font-semibold tabular-nums">{afterglow.counts[kind]}</dd>
          </div>
        ))}
      </dl>

      {afterglow.people.length === 0 ? (
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          No reactions yet. When friends react to your share link, you&apos;ll see who reacted and any notes here.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
          {afterglow.people.map((person) => (
            <li key={person.visitorId} className="flex flex-col gap-2 py-4">
              <p className="text-lg font-semibold">{person.name}</p>
              {person.reactions.length > 0 && (
                <ul className="flex flex-wrap gap-x-4 gap-y-1">
                  {person.reactions.map((reaction) => (
                    <li key={reaction.id} className="flex items-center gap-1 text-lg">
                      {REACTION_LABELS[reaction.kind]}
                      <RemoveButton
                        entryId={entry.id}
                        target={{ reactionId: reaction.id }}
                        label={`Remove ${person.name}'s ${REACTION_LABELS[reaction.kind]}`}
                      />
                    </li>
                  ))}
                </ul>
              )}
              {person.note && (
                <div className="flex items-start justify-between gap-2">
                  <p className="text-lg leading-7">&ldquo;{person.note.body}&rdquo;</p>
                  <RemoveButton entryId={entry.id} target={{ noteId: person.note.id }} label={`Remove ${person.name}'s note`} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <SharePanel entryId={entry.id} initial={share && { url: `${env.BETTER_AUTH_URL}/s/${share.id}`, place: share.place }} />
    </main>
  );
}
