// A score, always as an apricot badge with on-score numbers: apricot is a fill only, never a
// text colour (design system).
export function ScoreBadge({ score, size = "md", className = "" }: { score: number; size?: "sm" | "md" | "lg"; className?: string }) {
  const sizes = {
    sm: "px-2 py-0.5 text-caption",
    md: "px-3 py-1 text-label",
    lg: "px-4 py-1.5 text-display leading-none",
  };
  return (
    <span
      className={`inline-flex items-baseline gap-1 rounded-ss-sm bg-score font-bold text-on-score tabular-nums ${sizes[size]} ${className}`}
      aria-label={`Score ${score} out of 100`}
    >
      <span aria-hidden>{score}</span>
      {size === "lg" && (
        <span aria-hidden className="text-[0.4em] font-normal">
          / 100
        </span>
      )}
    </span>
  );
}
