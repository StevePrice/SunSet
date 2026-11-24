import { getCloudflareContext } from "@opennextjs/cloudflare";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { getEntry } from "@/lib/entries";
import { REACTION_KINDS, REACTION_LABELS, reactionLabel } from "@/lib/reaction-input";
import { getAfterglow } from "@/lib/reactions";
import { namesForEntry } from "@/lib/people";
import { listClips } from "@/lib/story/clips";
import { ButtonLink } from "@/components/button";
import { getShareForEntry, recipientVisitorIds, shareVoiceLinks } from "@/lib/shares";
import { LocalDate } from "@/components/local-date";
import { AppHeader, BottomBar } from "@/components/app-nav";
import { PhotoCard } from "@/components/photo-card";
import { ReactionIcon } from "@/components/reaction-icons";
import { LinkSettings } from "../link-settings";
import { ShareButton } from "../share-button";
import { RemoveButton } from "./remove-button";

export const metadata = { title: "From your friends · Sunset Soul" };

// What friends sent for one entry (PRD 6.9b): totals, who reacted, their notes. Owner only.
export default async function AfterglowPage(props: PageProps<"/journal/[id]/afterglow">) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const found = await withDrizzle(async (db) => {
    const entry = await getEntry(db, user.id, id);
    if (!entry) return null;
    const [afterglow, share, names, clips] = await Promise.all([
      getAfterglow(db, user.id, id),
      getShareForEntry(db, user.id, id),
      namesForEntry(db, user.id, id),
      listClips(db, user.id, id),
    ]);
    const [inPhoto, voice] = share
      ? await Promise.all([recipientVisitorIds(db, share.id), shareVoiceLinks(db, share.id)])
      : [new Set<string>(), { normal: false, people: [] }];
    // Share again goes through Before you share when there's something to ask (4f-3).
    const askFirst = names.length > 0 || clips.length > 0;
    return afterglow && { entry, afterglow, share, inPhoto, voice: clips.length ? voice : { normal: false, people: [] }, askFirst };
  });
  if (!found) notFound();
  const { entry, afterglow, share, inPhoto, voice, askFirst } = found;
  const { env } = await getCloudflareContext({ async: true });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pt-4 pb-8">
      <AppHeader back={{ href: `/journal/${entry.id}`, label: "Back" }} />
      <header className="flex flex-col gap-1">
        {/* "Afterglow" is the team's internal name for this screen; it never appears in the app. */}
        <h1 className="font-serif text-title-1">From your friends</h1>
      </header>

      <div className="flex items-center gap-4">
        <PhotoCard src={`/api/photos/${entry.id}/thumb`} alt="" square corners="sm" className="w-20 shrink-0" />
        <p className="font-serif text-title-3">{entry.title ?? <LocalDate iso={entry.takenAt.toISOString()} timeZone={entry.timeZone} />}</p>
      </div>

      <dl className="grid grid-cols-2 gap-2">
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
                      {reactionLabel(reaction.kind, inPhoto.has(person.visitorId))}
                      <RemoveButton
                        entryId={entry.id}
                        target={{ reactionId: reaction.id }}
                        label={`Remove ${person.name}'s ${reactionLabel(reaction.kind, inPhoto.has(person.visitorId))}`}
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

      {share ? (
        <>
          {askFirst ? (
            <ButtonLink href={`/journal/${entry.id}/share`} variant="action" className="w-full">
              Share again
            </ButtonLink>
          ) : (
            <ShareButton entryId={entry.id} initialUrl={`${env.BETTER_AUTH_URL}/s/${share.id}`} label="Share again" />
          )}
          <LinkSettings entryId={entry.id} share={{ url: `${env.BETTER_AUTH_URL}/s/${share.id}`, place: share.place }} voice={voice} />
        </>
      ) : (
        <section className="flex flex-col gap-3">
          <p className="text-ink-muted">Not shared. Share it to get a new link friends can open and react to.</p>
          {askFirst ? (
            <ButtonLink href={`/journal/${entry.id}/share`} variant="action" className="w-full">
              Share
            </ButtonLink>
          ) : (
            <ShareButton entryId={entry.id} initialUrl={null} />
          )}
        </section>
      )}
      <BottomBar current="journal" />
    </main>
  );
}
