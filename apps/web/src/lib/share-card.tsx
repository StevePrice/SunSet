/* eslint-disable @next/next/no-img-element -- rendered by Satori, not the browser. */
// The two images made for a share, rendered with next/og and cached in R2 under a hash of their
// content, so each is only redrawn when something on it changes:
// - the share card that link previews show (1200×630, the Open Graph size), and
// - the vertical Stories card (1080×1920) that the share sheet attaches.
// Colours, fonts and the logo mark come from the design system (generated token and asset
// modules), since Satori can't read CSS variables. The cards are always dark: they sit on photos.
import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
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
const LAYOUT_VERSION = "3";
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

// Satori draws in image pixels; the design system's sizes are in points on a phone. Each card has
// one scale factor (pixels per point), and every size on it is written in points and multiplied by
// it, so the mark, badge, insets and text keep the design's proportions:
// - link card (1200×630): 2 px/pt, about how much a phone's link preview enlarges it;
// - Stories card (1080×1920): 2.75 px/pt, since it fills a ~393pt-wide phone screen (1080 / 393).
// The inset is how far the mark (top-left) and score badge (bottom-right) sit from the edges
// (LOGO-USAGE.md: 12pt, 24pt on full-screen Stories cards).
export type CardLayout = { width: number; height: number; scale: number; inset: number };
export const CARD_LAYOUT: CardLayout = { width: CARD_WIDTH, height: CARD_HEIGHT, scale: 2, inset: 12 };
export const STORIES_LAYOUT: CardLayout = { width: STORIES_WIDTH, height: STORIES_HEIGHT, scale: 2.75, inset: 24 };

// The logo mark per LOGO-USAGE.md, in points: 34pt wide, centred on a 48pt photo-scrim square
// with 10pt corners.
export const MARK_PT = { width: 34, square: 48, radius: 10 } as const;

/** Where the mark's scrim square sits on a card, in image pixels. */
export function markBox(layout: CardLayout) {
  const px = (pt: number) => pt * layout.scale;
  return {
    left: px(layout.inset),
    top: px(layout.inset),
    size: px(MARK_PT.square),
    radius: px(MARK_PT.radius),
    markWidth: px(MARK_PT.width),
  };
}

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

/** The logo mark in the card's top-left corner, on its photo-scrim square. */
function Mark({ layout }: { layout: CardLayout }) {
  const box = markBox(layout);
  return (
    <div
      style={{
        position: "absolute",
        top: box.top,
        left: box.left,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: box.size,
        height: box.size,
        borderRadius: box.radius,
        backgroundColor: colors.dark.photoScrim,
      }}
    >
      <img src={markSrc} alt="Sunset Soul" width={box.markWidth} height={box.markWidth * MARK_RATIO} />
    </div>
  );
}

/** The score as the design system's badge: apricot fill, on-score numbers. `size` is in points. */
function ScoreBadge({ score, size, layout }: { score: number; size: number; layout: CardLayout }) {
  const px = size * layout.scale;
  return (
    <div
      style={{
        display: "flex",
        flexShrink: 0,
        alignItems: "baseline",
        gap: px / 10,
        padding: `${px / 8}px ${px / 3}px`,
        borderRadius: radius.sm * layout.scale,
        backgroundColor: colors.dark.score,
        color: colors.dark.onScore,
        fontFamily: "Atkinson Hyperlegible",
        fontWeight: 700,
      }}
    >
      <span style={{ fontSize: px }}>{score}</span>
      <span style={{ fontSize: px * 0.44, fontWeight: 400 }}>/ 100</span>
    </div>
  );
}

/**
 * The bottom of a card: the title and story across the full width, then the byline on the left
 * and, opposite the mark, the score badge in the bottom-right corner. The badge only shares a row
 * with the one-line byline, so the text never runs under it.
 */
function BottomText({ layout, score, badgeSize, gap, byline, children }: {
  layout: CardLayout;
  score: number | null;
  badgeSize: number;
  gap: number;
  byline: string;
  children: ReactNode;
}) {
  const inset = layout.inset * layout.scale;
  return (
    <div
      style={{
        position: "absolute",
        left: inset,
        right: inset,
        bottom: inset,
        display: "flex",
        flexDirection: "column",
        gap: gap * layout.scale,
        color: ink,
      }}
    >
      {children}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 * layout.scale }}>
        <div style={{ display: "flex", flexShrink: 1, fontFamily: "Atkinson Hyperlegible", fontSize: 13 * layout.scale }}>{byline}</div>
        {score !== null && <ScoreBadge score={score} size={badgeSize} layout={layout} />}
      </div>
    </div>
  );
}

export function renderCard(content: CardContent, photo: ArrayBuffer): Promise<ArrayBuffer> {
  const layout = CARD_LAYOUT;
  const pt = (n: number) => n * layout.scale;
  const response = new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", backgroundColor: colors.dark.surfacePage }}>
        <img src={photoSrc(photo)} alt="" width={CARD_WIDTH} height={CARD_HEIGHT} style={{ position: "absolute", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", backgroundImage: photoGradient(30, 40) }} />
        <Mark layout={layout} />
        <BottomText layout={layout} score={content.score} badgeSize={32} gap={6} byline={content.byline}>
          {content.story && <div style={{ fontFamily: "Fraunces", fontSize: pt(20), lineHeight: 1.3 }}>{content.story}</div>}
        </BottomText>
      </div>
    ),
    { width: CARD_WIDTH, height: CARD_HEIGHT, fonts: fonts() },
  );
  return response.arrayBuffer();
}

export function renderStoriesCard(content: StoriesContent, photo: ArrayBuffer): Promise<ArrayBuffer> {
  const layout = STORIES_LAYOUT;
  const pt = (n: number) => n * layout.scale;
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
        <div style={{ position: "absolute", inset: 0, display: "flex", backgroundImage: photoGradient(15, 45) }} />
        <Mark layout={layout} />
        <BottomText layout={layout} score={content.score} badgeSize={30} gap={9} byline={content.byline}>
          {content.title && (
            <div style={{ fontFamily: "Fraunces", fontSize: pt(26), lineHeight: 1.15, fontWeight: 600 }}>{content.title}</div>
          )}
          {content.story && <div style={{ fontFamily: "Fraunces", fontSize: pt(17), lineHeight: 1.4 }}>{content.story}</div>}
        </BottomText>
      </div>
    ),
    { width: STORIES_WIDTH, height: STORIES_HEIGHT, fonts: fonts() },
  );
  return response.arrayBuffer();
}
