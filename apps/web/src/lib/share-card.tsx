/* eslint-disable @next/next/no-img-element -- rendered by Satori, not the browser. */
// The two images made for a share, rendered with next/og and cached in R2 under a hash of their
// content, so each is only redrawn when something on it changes:
// - the share card that link previews show (1200×630, the Open Graph size), and
// - the vertical Stories card (1080×1920) that the share sheet attaches.
// Colours, fonts and the logo mark come from the design system (generated token and asset
// modules), since Satori can't read CSS variables. The cards are always dark: they sit on photos.
import { ImageResponse } from "next/og";
import { colors, radius } from "@/lib/design-tokens.generated";
import { formatTakenAt } from "@/lib/format";
import {
  atkinsonBoldBase64,
  atkinsonRegularBase64,
  frauncesRegularBase64,
  frauncesSemiBoldBase64,
  markForDarkBackgroundsSvg,
} from "@/lib/og-assets.generated";
import type { PublicShare } from "@/lib/shares";

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;
export const STORIES_WIDTH = 1080;
export const STORIES_HEIGHT = 1920;
// Bump when the layout changes, so cached cards are redrawn.
const LAYOUT_VERSION = "2";
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

// Satori draws in image pixels. Design-system sizes are in points on a phone, so they're scaled
// by how much the image is enlarged when shown on one: the link card at about 2×, the Stories
// card (full screen, 1080px across a ~390pt phone) at about 2.75×.
const CARD_SCALE = 2;
const STORIES_SCALE = 2.75;

const ink = colors.dark.ink;
const sunken = colors.dark.surfaceSunken;
// Darkens the top behind the mark and the bottom behind the text, so it reads without shadows.
const photoGradient = (topEnd: number, bottomStart: number) =>
  `linear-gradient(to bottom, ${colors.dark.photoScrim} 0%, ${sunken}00 ${topEnd}%, ${sunken}00 ${bottomStart}%, ${sunken}E6 100%)`;

const photoSrc = (photo: ArrayBuffer) => `data:image/jpeg;base64,${Buffer.from(photo).toString("base64")}`;
const markSrc = `data:image/svg+xml;base64,${Buffer.from(markForDarkBackgroundsSvg).toString("base64")}`;
const MARK_RATIO = 65.5 / 100;

type Fonts = NonNullable<NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"]>;
let fontCache: Fonts | undefined;
function fonts(): Fonts {
  const data = (b64: string) => {
    const buf = Buffer.from(b64, "base64");
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  };
  fontCache ??= [
    { name: "Fraunces", data: data(frauncesRegularBase64), weight: 400, style: "normal" },
    { name: "Fraunces", data: data(frauncesSemiBoldBase64), weight: 600, style: "normal" },
    { name: "Atkinson Hyperlegible", data: data(atkinsonRegularBase64), weight: 400, style: "normal" },
    { name: "Atkinson Hyperlegible", data: data(atkinsonBoldBase64), weight: 700, style: "normal" },
  ];
  return fontCache;
}

/** The logo mark per LOGO-USAGE.md: 34pt wide on a 48pt photo-scrim square with 10pt corners. */
function Mark({ scale }: { scale: number }) {
  const width = 34 * scale;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 48 * scale,
        height: 48 * scale,
        borderRadius: 10 * scale,
        backgroundColor: colors.dark.photoScrim,
      }}
    >
      <img src={markSrc} alt="Sunset Soul" width={width} height={width * MARK_RATIO} />
    </div>
  );
}

/** The score as the design system's badge: apricot fill, on-score numbers. */
function ScoreBadge({ score, size, scale }: { score: number; size: number; scale: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: size / 10,
        padding: `${size / 8}px ${size / 3}px`,
        borderRadius: radius.sm * scale,
        backgroundColor: colors.dark.score,
        color: colors.dark.onScore,
        fontFamily: "Atkinson Hyperlegible",
        fontWeight: 700,
      }}
    >
      <span style={{ fontSize: size }}>{score}</span>
      <span style={{ fontSize: size * 0.44, fontWeight: 400 }}>/ 100</span>
    </div>
  );
}

export function renderCard(content: CardContent, photo: ArrayBuffer): Promise<ArrayBuffer> {
  const response = new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", backgroundColor: colors.dark.surfacePage }}>
        <img src={photoSrc(photo)} alt="" width={CARD_WIDTH} height={CARD_HEIGHT} style={{ position: "absolute", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", backgroundImage: photoGradient(35, 40) }} />
        <div style={{ position: "absolute", top: 40, left: 48, display: "flex" }}>
          <Mark scale={CARD_SCALE} />
        </div>
        {content.score !== null && (
          <div style={{ position: "absolute", top: 36, right: 44, display: "flex" }}>
            <ScoreBadge score={content.score} size={64} scale={CARD_SCALE} />
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
            color: ink,
          }}
        >
          {content.story && <div style={{ fontFamily: "Fraunces", fontSize: 40, lineHeight: 1.3 }}>{content.story}</div>}
          <div style={{ fontFamily: "Atkinson Hyperlegible", fontSize: 26 }}>{content.byline}</div>
        </div>
      </div>
    ),
    { width: CARD_WIDTH, height: CARD_HEIGHT, fonts: fonts() },
  );
  return response.arrayBuffer();
}

export function renderStoriesCard(content: StoriesContent, photo: ArrayBuffer): Promise<ArrayBuffer> {
  const response = new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", backgroundColor: colors.dark.surfacePage }}>
        <img
          src={photoSrc(photo)}
          alt=""
          width={STORIES_WIDTH}
          height={STORIES_HEIGHT}
          style={{ position: "absolute", objectFit: "cover" }}
        />
        <div style={{ position: "absolute", inset: 0, display: "flex", backgroundImage: photoGradient(20, 45) }} />
        <div style={{ position: "absolute", top: 96, left: 72, display: "flex" }}>
          <Mark scale={STORIES_SCALE} />
        </div>
        {content.score !== null && (
          <div style={{ position: "absolute", top: 84, right: 72, display: "flex" }}>
            <ScoreBadge score={content.score} size={80} scale={STORIES_SCALE} />
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
            color: ink,
          }}
        >
          {content.title && (
            <div style={{ fontFamily: "Fraunces", fontSize: 72, lineHeight: 1.15, fontWeight: 600 }}>{content.title}</div>
          )}
          {content.story && <div style={{ fontFamily: "Fraunces", fontSize: 46, lineHeight: 1.4 }}>{content.story}</div>}
          <div style={{ fontFamily: "Atkinson Hyperlegible", fontSize: 34 }}>{content.byline}</div>
        </div>
      </div>
    ),
    { width: STORIES_WIDTH, height: STORIES_HEIGHT, fonts: fonts() },
  );
  return response.arrayBuffer();
}
