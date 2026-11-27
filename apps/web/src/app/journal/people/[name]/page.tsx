import { getCloudflareContext } from "@opennextjs/cloudflare";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader, BottomBar } from "@/components/app-nav";
import { ButtonLink } from "@/components/button";
import { LocalDate } from "@/components/local-date";
import { peopleHref } from "@/components/people";
import { PhotoCard } from "@/components/photo-card";
import { ShareIcon } from "@/components/share-icon";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { reactionLabel } from "@/lib/reaction-input";
import { getLiveSet, getSetReplies } from "@/lib/share-sets";
import { loadSunsetsWith } from "../load";
import { RemoveSetReply, SetLinkPanel } from "./set-panel";

export const metadata = { title: "Sunsets together · Sunset Soul" };

// Sunsets with [Name] (Build Spec 2.3, picture 19): every sunset the owner put this name on,
// newest first. Owner-only. "Send [Name] all your sunsets together" shares them as one link (4f-5);
// while that link is live, it's shown here with Copy link and Stop sharing, and replies to it below.
export default async function SunsetsWithPage(props: PageProps<"/journal/people/[name]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const found = await loadSunsetsWith(user.id, (await props.params).name);
  if (!found) notFound();
  const { name, entries } = found;
  const [live, replies] = await withDrizzle((db) => Promise.all([getLiveSet(db, user.id, name), getSetReplies(db, user.id, name)]));
  const { env } = await getCloudflareContext({ async: true });
  const first = entries.at(-1)!;
  const since = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: first.timeZone ?? undefined }).format(first.takenAt);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pt-2 pb-8">
      <AppHeader back={{ href: "/journal?show=people", label: "Journal" }} />
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-title-1">Sunsets with {name}</h1>
        <p className="text-caption text-ink-muted">
          {entries.length === 1 ? "1 sunset together" : `${entries.length} sunsets together, since ${since}`}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <ButtonLink href={`${peopleHref(name)}/share`} variant="action" className="w-full">
          <ShareIcon />
          {entries.length === 1 ? `Send ${name} your sunset together` : `Send ${name} all your sunsets together`}
        </ButtonLink>
        <p className="text-caption text-ink-muted">
          Sends one link with your sunsets together. You can leave any out first. To share just one sunset, open it and tap Share.
        </p>
      </div>

      {live && (
        <SetLinkPanel personName={name} setId={live.id} url={`${env.BETTER_AUTH_URL}/s/set/${live.id}`} count={live.entryIds.length} voice={live.includeVoice} />
      )}

      {replies.people.length > 0 && (
        <section aria-labelledby="set-replies" className="flex flex-col gap-2">
          <h2 id="set-replies" className="font-serif text-title-3">
            Replies to your sunsets together
          </h2>
          <ul className="flex flex-col divide-y divide-divider">
            {replies.people.map((person) => (
              <li key={person.visitorId} className="flex flex-col gap-2 py-4">
                <p className="text-label font-bold">{person.name}</p>
                {person.reactions.length > 0 && (
                  <ul className="flex flex-wrap gap-x-4 gap-y-1">
                    {person.reactions.map((reaction) => {
                      // A set is always for the named person, so "Wish I was there" reads "I was there!".
                      const label = reactionLabel(reaction.kind, true);
                      return (
                        <li key={reaction.id} className="flex items-center gap-1">
                          {label}
                          <RemoveSetReply personName={name} target={{ reactionId: reaction.id }} label={`Remove ${person.name}'s ${label}`} />
                        </li>
                      );
                    })}
                  </ul>
                )}
                {person.note && (
                  <div className="flex items-start justify-between gap-2">
                    <p className="ss-story text-ink-story">&ldquo;{person.note.body}&rdquo;</p>
                    <RemoveSetReply personName={name} target={{ noteId: person.note.id }} label={`Remove ${person.name}'s note`} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <ul className="flex flex-col gap-8">
        {entries.map((entry) => (
          <li key={entry.id}>
            <Link href={`/journal/${entry.id}`} className="group flex flex-col gap-2">
              <PhotoCard
                src={`/api/photos/${entry.id}/display`}
                alt={entry.title ?? entry.story ?? `A sunset with ${name}`}
                width={entry.photoWidth}
                height={entry.photoHeight}
                loading="lazy"
                className="group-hover:opacity-90"
              />
              <span className="mt-1 text-caption text-ink-muted">
                <LocalDate iso={entry.takenAt.toISOString()} timeZone={entry.timeZone} />
                {entry.placeName && ` · ${entry.placeName}`}
              </span>
              {entry.title && <span className="font-serif text-title-3">{entry.title}</span>}
              {entry.story && <span className="ss-story line-clamp-2 whitespace-pre-line text-ink-story">{entry.story}</span>}
            </Link>
          </li>
        ))}
      </ul>
      <BottomBar current="journal" />
    </main>
  );
}
