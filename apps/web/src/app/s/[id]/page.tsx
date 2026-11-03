/* eslint-disable @next/next/no-img-element -- the photo is served by /s/[id]/photo. */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ScoreBreakdown } from "@/components/score-card";
import { withDrizzle } from "@/lib/db";
import { CARD_HEIGHT, CARD_WIDTH, cardContent, cardVersion, shareByline } from "@/lib/share-card";
import { getPublicShare } from "@/lib/shares";

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

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-8">
      <img
        src={`/s/${id}/photo`}
        alt={share.story ?? "A sunset"}
        width={share.photoWidth}
        height={share.photoHeight}
        className="h-auto w-full rounded-2xl"
      />
      {share.title && <h1 className="text-3xl font-semibold tracking-tight">{share.title}</h1>}
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{shareByline(share)}</p>
      {share.story && <p className="whitespace-pre-wrap text-lg leading-8">{share.story}</p>}
      {share.score?.status === "done" && <ScoreBreakdown score={share.score} whose="the" />}
      <footer className="mt-4 flex flex-col items-start gap-2 border-t border-zinc-200 pt-5 dark:border-zinc-800">
        <p>
          Shared from <strong>Sunset Soul</strong>, a place to keep the sunsets that move you.
        </p>
        <Link href="/sign-in" className="rounded-lg bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700">
          Start your own Journal
        </Link>
      </footer>
    </main>
  );
}
