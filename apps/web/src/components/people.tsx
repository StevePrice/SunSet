import Link from "next/link";
import { CheckIcon } from "@/components/reaction-icons";

// Sunsets Together (Phase 4f): the people icon and name chips used on the story screen, the
// Journal and Entry Detail. A name chip is a 48px pill; a picked one fills with reaction-selected
// (the peach blush) and shows a checkmark, so the choice never relies on colour alone.

export function PeopleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg aria-hidden focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
      <circle cx="16.5" cy="9" r="2.8" />
      <path d="M16.5 14.5c2.6 0 4.5 1.6 5 4.5" />
    </svg>
  );
}

export const chipClass = "inline-flex min-h-12 items-center gap-2 rounded-ss-pill border-[1.5px] px-5 text-label font-bold";

/** A name to tap on or off (the story screen). */
export function NameToggle({ name, selected, onClick }: { name: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`${chipClass} ${
        selected ? "border-reaction-selected-border bg-reaction-selected text-on-reaction" : "border-border-subtle text-ink"
      }`}
    >
      {name}
      {selected && <CheckIcon />}
    </button>
  );
}

/** Where a name leads: Sunsets with [Name]. */
export function peopleHref(name: string): string {
  return `/journal/people/${encodeURIComponent(name)}`;
}

/** A name that opens Sunsets with [Name] (Journal, Entry Detail). */
export function NameLink({ name, count, icon = false }: { name: string; count?: number; icon?: boolean }) {
  return (
    <Link href={peopleHref(name)} className={`${chipClass} border-border-subtle text-ink`}>
      {icon && <PeopleIcon />}
      {name}
      {count !== undefined && <span className="font-normal text-ink-muted tabular-nums">{count}</span>}
    </Link>
  );
}

/** "With Steve" under a story card's title. */
export function WithLine({ names }: { names: string[] }) {
  if (!names.length) return null;
  return (
    <span className="flex items-center gap-2 text-caption text-ink-muted">
      <PeopleIcon size={18} />
      With {names.join(", ")}
    </span>
  );
}
