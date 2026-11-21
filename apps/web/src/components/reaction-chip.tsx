import { CheckIcon, ReactionIcon } from "@/components/reaction-icons";
import type { ReactionKind } from "@/lib/reaction-input";

// A reaction button on the Share Page (Phase 4e, Build Spec 3.12): line icon, word, count, filling
// its half of a two-by-two grid. A tapped chip fills with reaction-selected (a fill only) with its
// border and on-reaction text, and a checkmark beside the count, so the choice never relies on
// colour alone. Tap again to undo. At least 48px tall; long words wrap to a second line.
export function ReactionChip({
  kind,
  label,
  count,
  selected,
  animate = false,
  disabled,
  onClick,
}: {
  kind: ReactionKind;
  label: string;
  count: number;
  selected: boolean;
  animate?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-14 w-full items-center gap-3 rounded-ss-pill border-[1.5px] px-4 py-2 text-left text-label font-bold disabled:opacity-60 ${
        selected
          ? "border-reaction-selected-border bg-reaction-selected text-on-reaction"
          : "border-border-subtle bg-surface-raised text-ink"
      }`}
    >
      <ReactionIcon kind={kind} animate={animate} />
      <span className="min-w-0 flex-1 leading-tight">{label}</span>
      <span className={`flex shrink-0 items-center gap-1 tabular-nums ${selected ? "" : "font-normal"}`}>
        <span aria-label={`, ${count} so far`}>{count}</span>
        {selected && <CheckIcon />}
      </span>
    </button>
  );
}
