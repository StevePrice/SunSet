"use client";

import { formatTakenAt } from "@/lib/format";

// Sunsets happen in the evening, when the UTC date is often already tomorrow, so dates are
// shown in the viewer's own time zone. The server's rendering is replaced on hydration.
export function LocalDate({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {formatTakenAt(new Date(iso))}
    </time>
  );
}
