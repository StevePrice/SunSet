import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { HearYourVoice } from "@/app/journal/[id]/recording";
import { Reactions } from "@/app/s/[id]/reactions";
import { Logo } from "@/components/logo";
import { PhotoCard } from "@/components/photo-card";
import { anonymous, isBot, track } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { fitWithin, SHARE_PHOTO_EDGE } from "@/lib/photo-size";
import { parseVisitorId, VISITOR_COOKIE } from "@/lib/reaction-input";
import { shareByline } from "@/lib/share-card";
import { setDateRange, setGreeting } from "@/lib/share-set-input";
import { getPublicSet, getPublicSetReactions, type PublicSet } from "@/lib/share-sets";
import { formatDuration } from "@/lib/story/voice";

// A shared set (Phase 4f-5, Build Spec 2.5, picture 21): "Steve, Louise shared 11 sunsets with you",
// the sunsets in a scrolling list with their full stories, and one reply for the whole set. No
// account needed. Not indexed by search engines.
const loadSet = cache((id: string) => withDrizzle((db) => getPublicSet(db, id)));

export async function generateMetadata(props: PageProps<"/s/set/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const set = await loadSet(id);
  if (!set) return { title: "Sunset Soul", robots: { index: false } };
  const { env } = await getCloudflareContext({ async: true });
  const title = setGreeting(set.personName, set.ownerName, set.entries.length);
  const description = ["Our sunsets together", setDateRange(set.entries)].filter(Boolean).join(" · ");
  const first = set.entries[0];
  const size = fitWithin(first.photoWidth, first.photoHeight, SHARE_PHOTO_EDGE);
  const image = { url: `${env.BETTER_AUTH_URL}/s/set/${id}/photo/${first.entryId}`, type: "image/jpeg", ...size, alt: first.title ?? "A sunset" };
  return {
    title: `${title} · Sunset Soul`,
    description,
    robots: { index: false },
    openGraph: { type: "article", siteName: "Sunset Soul", url: `${env.BETTER_AUTH_URL}/s/set/${id}`, title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default async function SharedSetPage(props: PageProps<"/s/set/[id]">) {
  const { id } = await props.params;
  const set = await loadSet(id);
  if (!set) notFound();
  const visitorId = parseVisitorId((await cookies()).get(VISITOR_COOKIE)?.value);
  const reactions = await withDrizzle((db) => getPublicSetReactions(db, id, visitorId));
  if (!reactions) notFound();
  await trackView(set, visitorId);
  const owner = set.ownerName ?? "them";
  const range = setDateRange(set.entries);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-8">
      <header className="flex flex-col gap-1">
        <p className="text-body">
          <strong>{set.personName}</strong>, {set.ownerName ?? "someone"} shared{" "}
          {set.entries.length === 1 ? "1 sunset" : `${set.entries.length} sunsets`} with you
        </p>
        <h1 className="font-serif text-title-1">Our sunsets together</h1>
        {range && <p className="text-caption text-ink-muted">{range}</p>}
      </header>

      <ol aria-label="The sunsets" className="flex flex-col gap-10">
        {set.entries.map((entry) => {
          const photo = fitWithin(entry.photoWidth, entry.photoHeight, SHARE_PHOTO_EDGE);
          const voiceMs = entry.clips.reduce((total, c) => total + c.durationMs, 0);
          return (
            <li key={entry.entryId} className="flex flex-col gap-3">
              <PhotoCard
                src={`/s/set/${id}/photo/${entry.entryId}`}
                alt={entry.story ?? entry.title ?? "A sunset"}
                width={photo.width}
                height={photo.height}
                loading="lazy"
              />
              <div className="flex flex-col gap-1">
                <p className="text-caption text-ink-muted">{shareByline({ ...entry, ownerName: null })}</p>
                {entry.title && <h2 className="font-serif text-title-2">{entry.title}</h2>}
              </div>
              {entry.clips.length > 0 && (
                <HearYourVoice
                  clips={entry.clips.map((c) => `/s/set/${id}/voice/${c.id}`)}
                  title={`Hear ${owner} tell it`}
                  playLabel={`${owner}'s recording`}
                  subtitle={formatDuration(voiceMs)}
                />
              )}
              {entry.story && <p className="ss-story whitespace-pre-wrap text-ink-story">{entry.story}</p>}
            </li>
          );
        })}
      </ol>

      <hr className="border-divider" />
      <Reactions
        shareId={id}
        set
        initial={reactions.name ? reactions : { ...reactions, name: set.personName }}
        initialAddition={null}
        ownerName={set.ownerName}
      />
      <footer className="mt-4 flex flex-col items-start gap-3 border-t border-divider pt-5">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-caption text-ink-muted">Shared from</span>
          <Logo width={132} />
        </p>
        <p>A place to keep the sunsets that move you, and the stories behind them.</p>
        {/* A plain link, not <Link>: prefetching would count as a tap. */}
        <a href={`/s/set/${id}/join`} className="inline-flex min-h-12 items-center text-label underline">
          Start your own Journal
        </a>
      </footer>
    </main>
  );
}

// A friend opening the set (not a link-preview fetcher, and not the owner checking their own link).
async function trackView(set: PublicSet, visitorId: string | null) {
  if (isBot((await headers()).get("user-agent"))) return;
  const viewer = await getCurrentUser().catch(() => null);
  if (viewer?.id === set.ownerId) return;
  const voice = set.entries.some((e) => e.clips.length > 0);
  const { distinctId, properties } = anonymous({ set_id: set.id, sunsets: set.entries.length, returning_friend: visitorId !== null, voice_included: voice });
  await track("set_page_viewed", visitorId ?? distinctId, properties);
}
