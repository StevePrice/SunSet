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
import { AppHeader } from "@/components/logo";
import { PhotoCard } from "@/components/photo-card";
import { ReactionIcon } from "@/components/reaction-icons";
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
      <AppHeader />
      <Link href={`/journal/${entry.id}`} className="inline-flex min-h-12 items-center self-start text-label underline">
        ← Back to this sunset
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="font-serif text-title-1">Afterglow</h1>
        <p className="text-body text-ink-muted">from your friends</p>
      </header>

      <div className="flex items-center gap-4">
        <PhotoCard src={`/api/photos/${entry.id}/thumb`} alt="" square corners="sm" className="w-20 shrink-0" />
        <p className="font-serif text-title-3">{entry.title ?? <LocalDate iso={entry.takenAt.toISOString()} />}</p>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        {REACTION_KINDS.map((kind) => (
          <div key={kind} className="flex flex-col-reverse items-center gap-1 rounded-ss-lg bg-surface-raised p-3 text-center">
            <dt className="flex flex-col items-center gap-1 text-label">
              <ReactionIcon kind={kind} />
              {REACTION_LABELS[kind]}
            </dt>
            <dd className="font-serif text-title-1 tabular-nums">{afterglow.counts[kind]}</dd>
          </div>
        ))}
      </dl>

      {afterglow.people.length === 0 ? (
        <p className="text-ink-muted">
          No reactions yet. When friends react to your share link, you&apos;ll see who reacted and any notes here.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-divider">
          {afterglow.people.map((person) => (
            <li key={person.visitorId} className="flex flex-col gap-2 py-4">
              <p className="text-label font-bold">{person.name}</p>
              {person.reactions.length > 0 && (
                <ul className="flex flex-wrap gap-x-4 gap-y-1">
                  {person.reactions.map((reaction) => (
                    <li key={reaction.id} className="flex items-center gap-1">
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
                  <p className="ss-story text-ink-story">&ldquo;{person.note.body}&rdquo;</p>
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
