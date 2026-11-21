import type { ReactNode } from "react";
import type { ReactionKind } from "@/lib/reaction-input";

// Line icons beside the reaction words (PRD 6.9a: no emoji), as drawn for Phase 4e (Build Spec 4):
// Wow is a sun with rays, Wish I was there a horizon, Love this! a heart, Sending hugs a person with
// open arms. 24×24, 1.8 stroke, round ends, in currentColor so they take the text colour around them.
// Each has one short animation when tapped (globals.css: rays spread, horizon glows, heart beats,
// arms open wide), skipped when the phone asks for reduced motion. The `ss-anim-part` group is the
// part that moves.
const paths: Record<ReactionKind, ReactNode> = {
  wow: (
    <>
      <circle cx="12" cy="12" r="3.6" />
      <path className="ss-anim-part" d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M5.5 18.5l2.1-2.1M16.4 7.6l2.1-2.1" />
    </>
  ),
  wish: (
    <>
      <path d="M2.5 16.5h19M8 20h8" />
      <path className="ss-anim-part" d="M6.5 16.5a5.5 5.5 0 0 1 11 0" />
    </>
  ),
  love: <path className="ss-anim-part" d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z" />,
  hugs: (
    <>
      <circle cx="12" cy="5.5" r="2.4" />
      <path d="M12 9.5v6M12 15.5l-3 5M12 15.5l3 5" />
      <path className="ss-anim-part" d="M3.5 8.5c3 2.3 5.6 3 8.5 3s5.5-.7 8.5-3" />
    </>
  ),
};

/**
 * The icon for a reaction, decorative (the word beside it is the label). `animate` plays its
 * animation once, for the reaction just tapped.
 */
export function ReactionIcon({
  kind,
  size = 24,
  animate = false,
  className = "",
}: {
  kind: ReactionKind;
  size?: number;
  animate?: boolean;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${animate ? `ss-anim-${kind}` : ""} ${className}`}
    >
      {paths[kind]}
    </svg>
  );
}

/** The checkmark beside a tapped reaction's count, so the choice never relies on colour alone. */
export function CheckIcon({ size = 18 }: { size?: number }) {
  return (
    <svg aria-hidden focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}
