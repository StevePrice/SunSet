import { ReactionIcon } from "@/components/reaction-icons";
import type { ReactionKind } from "@/lib/reaction-input";

// A reaction button (Wow, Wish I was there, Love this!) with its line icon beside the word. A
// tapped chip fills with reaction-selected (peach blush), a fill only, with on-reaction text and
// icon. 48px tall, pill-shaped.
export function ReactionChip({
  kind,
  label,
  count,
  selected,
  disabled,
  onClick,
}: {
  kind: ReactionKind;
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
      <ReactionIcon kind={kind} />
      <span>{label}</span>
      <span className="font-normal tabular-nums" aria-label={`, ${count} so far`}>
        {count}
      </span>
    </button>
  );
}
