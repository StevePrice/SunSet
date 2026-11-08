/* eslint-disable @next/next/no-img-element -- rendered by Satori, not the browser. */
// The two images made for a share, rendered with next/og and cached in R2 under a hash of their
// content, so each is only redrawn when something on it changes:
// - the share card that link previews show (1200×630, the Open Graph size), and
// - the vertical Stories card (1080×1920) that the share sheet attaches.
import { ImageResponse } from "next/og";
import { formatTakenAt } from "@/lib/format";
import type { PublicShare } from "@/lib/shares";

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;
export const STORIES_WIDTH = 1080;
export const STORIES_HEIGHT = 1920;
// Bump when the layout changes, so cached cards are redrawn.
const LAYOUT_VERSION = "1";
const MAX_CARD_STORY = 140;
const MAX_STORIES_STORY = 280;

export type CardKind = "card" | "stories";

export type CardContent = {
  story: string | null;
  score: number | null;
  byline: string;
};

export type StoriesContent = CardContent & { title: string | null };

export function shareByline(share: Pick<PublicShare, "ownerName" | "takenAt" | "timeZone" | "place">): string {
  return [share.ownerName, formatTakenAt(share.takenAt, share.timeZone), share.place].filter(Boolean).join(" · ");
}

function shorten(text: string | null, max: number): string | null {
  return text && text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function cardStory(share: PublicShare): string | null {
  // The caption is written for strangers, so it's preferred over the private story.
  return (share.caption ?? share.story)?.replace(/\s+/g, " ").trim() || null;
}

export function cardContent(share: PublicShare): CardContent {
  return {
    story: shorten(cardStory(share), MAX_CARD_STORY),
    score: share.score?.status === "done" ? share.score.displayScore : null,
    byline: shareByline(share),
  };
}

/** The Stories card has room for the title and a longer story. */
export function storiesCardContent(share: PublicShare): StoriesContent {
  return {
    title: share.title?.trim() || null,
    story: shorten(cardStory(share), MAX_STORIES_STORY),
    score: share.score?.status === "done" ? share.score.displayScore : null,
    byline: shareByline(share),
  };
}

/** Short hash of everything drawn on the image; part of its URL and R2 key. */
export async function cardVersion(content: CardContent | StoriesContent, kind: CardKind = "card"): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify([LAYOUT_VERSION, kind, content]));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest.slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
}

const photoSrc = (photo: ArrayBuffer) => `data:image/jpeg;base64,${Buffer.from(photo).toString("base64")}`;
const shadow = "0 2px 12px rgba(0,0,0,0.6)";

function ScoreBadge({ score, size }: { score: number; size: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: size / 10,
        padding: `${size / 6}px ${size / 2.6}px`,
        borderRadius: 999,
        backgroundColor: "#ea580c",
        color: "white",
      }}
    >
      <span style={{ fontSize: size }}>{score}</span>
      <span style={{ fontSize: size * 0.44, opacity: 0.85 }}>/ 100</span>
    </div>
  );
}

export function renderCard(content: CardContent, photo: ArrayBuffer): Promise<ArrayBuffer> {
  const response = new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", backgroundColor: "#1c1917" }}>
        <img src={photoSrc(photo)} alt="" width={CARD_WIDTH} height={CARD_HEIGHT} style={{ position: "absolute", objectFit: "cover" }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.75) 100%)",
          }}
        />
        <div style={{ position: "absolute", top: 40, left: 48, fontSize: 30, color: "white", textShadow: shadow }}>
          Sunset Soul
        </div>
        {content.score !== null && (
          <div style={{ position: "absolute", top: 36, right: 44, display: "flex" }}>
            <ScoreBadge score={content.score} size={64} />
          </div>
        )}
        <div
          style={{
            position: "absolute",
            left: 48,
            right: 48,
            bottom: 40,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            color: "white",
            textShadow: shadow,
          }}
        >
          {content.story && <div style={{ fontSize: 40, lineHeight: 1.3 }}>{content.story}</div>}
          <div style={{ fontSize: 26, opacity: 0.9 }}>{content.byline}</div>
        </div>
      </div>
    ),
    { width: CARD_WIDTH, height: CARD_HEIGHT },
  );
  return response.arrayBuffer();
}

export function renderStoriesCard(content: StoriesContent, photo: ArrayBuffer): Promise<ArrayBuffer> {
  const response = new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", backgroundColor: "#1c1917" }}>
        <img
          src={photoSrc(photo)}
          alt=""
          width={STORIES_WIDTH}
          height={STORIES_HEIGHT}
          style={{ position: "absolute", objectFit: "cover" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.8) 100%)",
          }}
        />
        <div style={{ position: "absolute", top: 96, left: 72, fontSize: 44, color: "white", textShadow: shadow }}>
          Sunset Soul
        </div>
        {content.score !== null && (
          <div style={{ position: "absolute", top: 84, right: 72, display: "flex" }}>
            <ScoreBadge score={content.score} size={80} />
          </div>
        )}
        <div
          style={{
            position: "absolute",
            left: 72,
            right: 72,
            bottom: 160,
            display: "flex",
            flexDirection: "column",
            gap: 24,
            color: "white",
            textShadow: shadow,
          }}
        >
          {content.title && <div style={{ fontSize: 72, lineHeight: 1.15, fontWeight: 600 }}>{content.title}</div>}
          {content.story && <div style={{ fontSize: 46, lineHeight: 1.35 }}>{content.story}</div>}
          <div style={{ fontSize: 34, opacity: 0.9 }}>{content.byline}</div>
        </div>
      </div>
    ),
    { width: STORIES_WIDTH, height: STORIES_HEIGHT },
  );
  return response.arrayBuffer();
}
