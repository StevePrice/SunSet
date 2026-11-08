"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { PhotoCard } from "@/components/photo-card";
import { groupByMonth } from "@/lib/journal-view";

export type GridPhoto = { id: string; takenAt: string; score: number | null; alt: string };

const noSubscribe = () => () => {};
const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

// The All photos view: square photos two to a row (never three), 8pt apart with 10pt corners,
// under month headings, and nothing but the score badge on them. Months are worked out in the
// viewer's time zone, like the dates shown elsewhere (LocalDate). The server and hydration render
// use UTC, then the browser's time zone takes over, so there's no hydration mismatch.
export function PhotoGrid({ photos }: { photos: GridPhoto[] }) {
  const timeZone = useSyncExternalStore(noSubscribe, browserTimeZone, () => "UTC");
  return (
    <div className="flex flex-col gap-6">
      {groupByMonth(photos, timeZone).map((month) => (
        <section key={month.key} className="flex flex-col gap-3" aria-labelledby={`month-${month.key}`}>
          <h2 id={`month-${month.key}`} className="font-serif text-title-3">
            {month.label}
          </h2>
          <ul className="grid grid-cols-2 gap-2">
            {month.items.map((photo) => (
              <li key={photo.id}>
                <Link href={`/journal/${photo.id}`} className="block hover:opacity-90">
                  <PhotoCard
                    src={`/api/photos/${photo.id}/thumb`}
                    alt={photo.alt}
                    score={photo.score}
                    square
                    corners="sm"
                    loading="lazy"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
