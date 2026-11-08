import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ButtonLink } from "@/components/button";
import { Logo } from "@/components/logo";
import { PhotoCard } from "@/components/photo-card";
import { ScoreBreakdown } from "@/components/score-card";
import { withDrizzle } from "@/lib/db";
import { CARD_HEIGHT, CARD_WIDTH, cardContent, cardVersion, shareByline } from "@/lib/share-card";
import { parseVisitorId, VISITOR_COOKIE } from "@/lib/reaction-input";
import { getPublicReactions } from "@/lib/reactions";
import { getPublicShare } from "@/lib/shares";
import { Reactions } from "./reactions";

// A shared sunset, readable by anyone with the link and no account. Not indexed by search engines.
const loadShare = cache((id: string) => withDrizzle((db) => getPublicShare(db, id)));

export async function generateMetadata(props: PageProps<"/s/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const share = await loadShare(id);
  if (!share) return { title: "Sunset Soul", robots: { index: false } };

  const { env } = await getCloudflareContext({ async: true });
  const content = cardContent(share);
  const card = `${env.BETTER_AUTH_URL}/s/${id}/card?v=${await cardVersion(content)}`;
  const title = share.title ?? (share.ownerName ? `A sunset from ${share.ownerName}` : "A sunset on Sunset Soul");
  const description = content.story ?? shareByline(share);
  const image = { url: card, width: CARD_WIDTH, height: CARD_HEIGHT, alt: content.story ?? "A sunset" };
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
  const reactions = await withDrizzle((db) => getPublicReactions(db, id, visitorId));
  if (!reactions) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-8">
      <p className="text-lg text-ink-muted">
        {share.ownerName ? `${share.ownerName} shared a sunset with you` : "A sunset shared with you"}
      </p>
      <PhotoCard src={`/s/${id}/photo`} alt={share.story ?? "A sunset"} width={share.photoWidth} height={share.photoHeight} />
      {share.title && <h1 className="font-serif text-title-2">{share.title}</h1>}
      <p className="text-base text-ink-muted">{shareByline(share)}</p>
      {share.score?.status === "done" && <ScoreBreakdown score={share.score} whose="the" />}
      {share.story && <p className="ss-story whitespace-pre-wrap text-ink-story">{share.story}</p>}
      <Reactions shareId={id} initial={reactions} ownerName={share.ownerName} />
      <footer className="mt-4 flex flex-col items-start gap-3 border-t border-divider pt-5">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>Shared from</span>
          <Logo width={132} />
        </p>
        <p className="text-ink-muted">A place to keep the sunsets that move you.</p>
        <ButtonLink href="/sign-in?mode=sign-up">Start your own Journal</ButtonLink>
      </footer>
    </main>
  );
}
