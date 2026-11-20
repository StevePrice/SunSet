"use client";

import { formatTakenAt } from "@/lib/format";

// Sunsets happen in the evening, when the UTC date is often already tomorrow. One rule everywhere
// (Phase 4e): an entry's date is shown in its own time zone (the place's, or the owner's phone's
// when saved), so the Journal, Entry Detail and the Share Page always agree. Without one (old
// entries, or dates that aren't an entry's), the viewer's time zone, replaced on hydration.
export function LocalDate({ iso, timeZone }: { iso: string; timeZone?: string | null }) {
  return (
    <time dateTime={iso} suppressHydrationWarning={!timeZone}>
      {formatTakenAt(new Date(iso), timeZone ?? undefined)}
    </time>
  );
}
