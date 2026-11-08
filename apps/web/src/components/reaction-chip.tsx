// A reaction button (Wow, Wish I was there, Love this!). A tapped chip fills with
// reaction-selected (peach blush), a fill only, with on-reaction text. 48px tall, pill-shaped.
export function ReactionChip({
  label,
  count,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  count: number;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-12 items-center gap-2 rounded-ss-pill border px-5 text-label font-bold disabled:opacity-60 ${
        selected
          ? "border-reaction-selected-border bg-reaction-selected text-on-reaction"
          : "border-border-subtle bg-surface-raised text-ink"
      }`}
    >
      <span>{label}</span>
      <span className="font-normal tabular-nums" aria-label={`, ${count} so far`}>
        {count}
      </span>
    </button>
  );
}
