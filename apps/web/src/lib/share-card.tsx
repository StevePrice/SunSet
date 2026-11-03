/* eslint-disable @next/next/no-img-element -- rendered by Satori, not the browser. */
// The share card: the image link previews show (1200×630, the Open Graph size). Rendered with
// next/og and cached in R2 under a hash of its content, so it's only redrawn when something on
// it changes.
import { ImageResponse } from "next/og";
import { formatTakenAt } from "@/lib/format";
import type { PublicShare } from "@/lib/shares";

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;
// Bump when the layout changes, so cached cards are redrawn.
const LAYOUT_VERSION = "1";
const MAX_CARD_STORY = 140;

export type CardContent = {
  story: string | null;
  score: number | null;
  byline: string;
};

export function shareByline(share: Pick<PublicShare, "ownerName" | "takenAt" | "timeZone" | "place">): string {
  return [share.ownerName, formatTakenAt(share.takenAt, share.timeZone), share.place].filter(Boolean).join(" · ");
}

export function cardContent(share: PublicShare): CardContent {
  const story = share.story?.replace(/\s+/g, " ").trim() || null;
  return {
    story: story && story.length > MAX_CARD_STORY ? `${story.slice(0, MAX_CARD_STORY - 1).trimEnd()}…` : story,
    score: share.score?.status === "done" ? share.score.displayScore : null,
    byline: shareByline(share),
  };
}

/** Short hash of everything drawn on the card; part of the card's URL and R2 key. */
export async function cardVersion(content: CardContent): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify([LAYOUT_VERSION, content]));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest.slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function renderCard(content: CardContent, photo: ArrayBuffer): Promise<ArrayBuffer> {
  const src = `data:image/jpeg;base64,${Buffer.from(photo).toString("base64")}`;
  const shadow = "0 2px 12px rgba(0,0,0,0.6)";
  const response = new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", backgroundColor: "#1c1917" }}>
        <img src={src} alt="" width={CARD_WIDTH} height={CARD_HEIGHT} style={{ position: "absolute", objectFit: "cover" }} />
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
          <div
            style={{
              position: "absolute",
              top: 36,
              right: 44,
              display: "flex",
              alignItems: "baseline",
              gap: 6,
              padding: "10px 24px",
              borderRadius: 999,
              backgroundColor: "#ea580c",
              color: "white",
            }}
          >
            <span style={{ fontSize: 64 }}>{content.score}</span>
            <span style={{ fontSize: 28, opacity: 0.85 }}>/ 100</span>
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
