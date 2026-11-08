/* eslint-disable @next/next/no-img-element -- photos are private or per-share, served by our own routes. */
import { ScoreBadge } from "@/components/score-badge";

// A person's photo. Nothing goes on it except the score badge: no text, filters, logo or
// border (design system). In the app the badge sits top-right; only shared images (cards) put it
// bottom-right, opposite the logo mark.
// Photos are inset 16pt from the screen edges (the page's px-4) with radius.md corners. `bleed`
// is for the top of Entry Detail only: edge to edge with square corners on phones, and capped,
// centred and rounded again once the screen is wider than the cap.
export function PhotoCard({
  src,
  alt,
  width,
  height,
  score = null,
  square = false,
  bleed = false,
  corners = "md",
  loading,
  className = "",
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  score?: number | null;
  square?: boolean;
  bleed?: boolean;
  /** radius.md (14pt) for photos; radius.sm (10pt) for small ones (the All photos grid, thumbnails). */
  corners?: "md" | "sm";
  loading?: "lazy" | "eager";
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${bleed ? "mx-auto w-full max-w-2xl md:rounded-ss-md" : corners === "sm" ? "rounded-ss-sm" : "rounded-ss-md"} ${className}`}>
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        className={square ? "aspect-square w-full object-cover" : "h-auto w-full"}
      />
      {score != null && <ScoreBadge score={score} size="sm" className="absolute top-2 right-2" />}
    </div>
  );
}
