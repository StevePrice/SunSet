"use client";

// An on/off switch (Include my voice, Phase 4f-3, picture 23). A button with role="switch", so
// screen readers announce on or off; the thumb moves and the track fills, so it never relies on
// colour alone. 64 × 36, inside a 48px tap area.
export function Switch({
  checked,
  onChange,
  labelledBy,
  describedBy,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  labelledBy: string;
  describedBy?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClick={() => onChange(!checked)}
      className="flex min-h-12 shrink-0 items-center"
    >
      <span
        className={`flex h-9 w-16 items-center rounded-ss-pill border-[1.5px] p-1 transition-colors ${
          checked ? "justify-end border-action bg-action" : "justify-start border-border-subtle bg-surface-sunken"
        }`}
      >
        <span className={`size-6 rounded-ss-pill ${checked ? "bg-on-action" : "bg-ink"}`} />
      </span>
    </button>
  );
}
