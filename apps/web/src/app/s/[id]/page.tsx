import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Logo } from "@/components/logo";
import { PhotoCard } from "@/components/photo-card";
import { anonymous, isBot, shareFacts, track } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { CARD_HEIGHT, CARD_WIDTH, cardContent, cardVersion, shareByline } from "@/lib/share-card";
import { parseVisitorId, VISITOR_COOKIE } from "@/lib/reaction-input";
import { getMyAddition } from "@/lib/additions";
import { getPublicReactions } from "@/lib/reactions";
import { getPublicShare, getRecipient, parseRecipientToken, type Recipient } from "@/lib/shares";
import { listClips } from "@/lib/story/clips";
import { formatDuration } from "@/lib/story/voice";
import { HearYourVoice } from "@/app/journal/[id]/recording";
import { fitWithin, SHARE_PHOTO_EDGE } from "@/lib/photo-size";
import { Reactions } from "./reactions";

// A shared sunset, readable by anyone with the link and no account. Not indexed by search engines.
const loadShare = cache((id: string) => withDrizzle((db) => getPublicShare(db, id)));
// A personal link (4f-3): /s/[id]?r=[token] for someone named in the photo.
const loadRecipient = cache((id: string, token: string | null) => withDrizzle((db) => getRecipient(db, id, token)));

function tokenFrom(params: Record<string, string | string[] | undefined>): string | null {
  return parseRecipientToken(params.r);
}

export async function generateMetadata(props: PageProps<"/s/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const share = await loadShare(id);
  if (!share) return { title: "Sunset Soul", robots: { index: false } };

  const { env } = await getCloudflareContext({ async: true });
  const content = cardContent(share);
  const card = `${env.BETTER_AUTH_URL}/s/${id}/card?v=${await cardVersion(content)}`;
  const recipient = await loadRecipient(id, tokenFrom(await props.searchParams));
  // A personal link's preview greets the person ("Steve, you're in Louise's sunset").
  const title = recipient
    ? `${recipient.name}, you're in ${share.ownerName ? `${share.ownerName}'s` : "this"} sunset`
    : (share.title ?? (share.ownerName ? `A sunset from ${share.ownerName}` : "A sunset on Sunset Soul"));
  const description = content.story ?? shareByline(share);
  const image = { url: card, type: "image/jpeg", width: CARD_WIDTH, height: CARD_HEIGHT, alt: content.story ?? "A sunset" };
  return {
    title: `${title} · Sunset Soul`,
    description,
    robots: { index: false },
    openGraph: { type: "article", siteName: "Sunset Soul", url: `${env.BETTER_AUTH_URL}/s/${id}`, title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [card] },
  };
}

export default async function SharedSunsetPage(props: PageProps<"/s/[id]">) {
  const { id } = await props.params;
  const share = await loadShare(id);
  if (!share) notFound();
  const visitorId = parseVisitorId((await cookies()).get(VISITOR_COOKIE)?.value);
  const token = tokenFrom(await props.searchParams);
  const recipient = await loadRecipient(id, token);
  const [reactions, clips, addition] = await withDrizzle((db) =>
    Promise.all([getPublicReactions(db, id, visitorId), listClips(db, share.ownerId, share.entryId), getMyAddition(db, id, visitorId)]),
  );
  if (!reactions) notFound();
  // Include my voice: the personal link's own switch, else the normal link's. Deleting the
  // recording removes it here too.
  const voice = (recipient ? recipient.includeVoice : share.includeVoice) && clips.length > 0;
  // Carried on the voice and "Start your own Journal" links, so they know it's a personal link.
  const voiceQuery = recipient && token ? `?r=${token}` : "";
  await trackView(share, visitorId, recipient, voice);
  // /photo serves the share size (the display photo scaled to SHARE_PHOTO_EDGE).
  const photo = fitWithin(share.photoWidth, share.photoHeight, SHARE_PHOTO_EDGE);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-8">
      <p className="text-body">
        {recipient ? (
          <>
            <strong>{recipient.name}</strong>, you&apos;re in {share.ownerName ? `${share.ownerName}'s` : "this"} sunset
          </>
        ) : share.ownerName ? (
          <>
            <strong>{share.ownerName}</strong> shared a sunset with you
          </>
        ) : (
          "A sunset shared with you"
        )}
      </p>
      <PhotoCard src={`/s/${id}/photo`} alt={share.story ?? "A sunset"} width={photo.width} height={photo.height} />
      <div className="flex flex-col gap-1">
        {share.title && <h1 className="font-serif text-title-2">{share.title}</h1>}
        {/* Date and place only: the owner's name is in the line above. */}
        <p className="text-caption text-ink-muted">{shareByline({ ...share, ownerName: null })}</p>
      </div>
      {voice && (
        <HearYourVoice
          clips={clips.map((c) => `/s/${id}/voice/${c.id}${voiceQuery}`)}
          title={`Hear ${share.ownerName ?? "them"} tell it`}
          subtitle={formatDuration(clips.reduce((total, c) => total + c.durationMs, 0))}
        />
      )}
      {share.story && <p className="ss-story whitespace-pre-wrap text-ink-story">{share.story}</p>}
      <hr className="border-divider" />
      <Reactions
        shareId={id}
        initial={recipient && !reactions.name ? { ...reactions, name: recipient.name } : reactions}
        initialAddition={addition}
        ownerName={share.ownerName}
        recipientToken={recipient ? token : null}
      />
      <footer className="mt-4 flex flex-col items-start gap-3 border-t border-divider pt-5">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-caption text-ink-muted">Shared from</span>
          <Logo width={132} />
        </p>
        <p>A place to keep the sunsets that move you, and the stories behind them.</p>
        {/* A plain link, not <Link>: prefetching would count as a tap. */}
        <a href={`/s/${id}/join${voiceQuery}`} className="inline-flex min-h-12 items-center text-label underline">
          Start your own Journal
        </a>
      </footer>
    </main>
  );
}

// A friend opening the link (not a link-preview fetcher, and not the owner checking their own link).
async function trackView(
  share: { id: string; entryId: string; ownerId: string },
  visitorId: string | null,
  recipient: Recipient | null,
  voice: boolean,
) {
  if (isBot((await headers()).get("user-agent"))) return;
  const viewer = await getCurrentUser().catch(() => null);
  if (viewer?.id === share.ownerId) return;
  const facts = await withDrizzle((db) => shareFacts(db, share.id));
  const { distinctId, properties } = anonymous({ ...facts, returning_friend: visitorId !== null, personal: recipient !== null, voice_included: voice });
  await track("share_page_viewed", visitorId ?? distinctId, properties);
}
