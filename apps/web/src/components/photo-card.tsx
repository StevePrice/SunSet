/* eslint-disable @next/next/no-img-element -- photos are private or per-share, served by our own routes. */
import { ScoreBadge } from "@/components/score-badge";

// A person's photo. Nothing goes on it except the score badge: no text, filters, logo or
// border (design system). The badge stays top-right until Phase 4d moves it.
export function PhotoCard({
  src,
  alt,
  width,
  height,
  score = null,
  square = false,
  loading,
  className = "",
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  score?: number | null;
  square?: boolean;
  loading?: "lazy" | "eager";
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-ss-md ${className}`}>
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
