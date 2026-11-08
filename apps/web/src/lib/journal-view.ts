// The Journal's two views (design system): Stories (photo cards with their stories) and All photos
// (a two-column grid grouped by month). The view lives in the URL (?view=photos) so it survives
// reloads and back navigation; Stories is the default.

export type JournalView = "stories" | "photos";

export function parseJournalView(value: string | string[] | undefined): JournalView {
  return value === "photos" ? "photos" : "stories";
}

export function journalViewHref(view: JournalView): string {
  return view === "photos" ? "/journal?view=photos" : "/journal";
}

export type MonthGroup<T> = { key: string; label: string; items: T[] };

/**
 * Groups items (newest first, as the Journal lists them) under month headings such as
 * "November 2026", by the month their date falls in in `timeZone`. Dates are shown in the
 * viewer's time zone, so grouping uses it too: a sunset late on 31 October UTC that the viewer
 * sees as 1 November goes under November.
 */
export function groupByMonth<T extends { takenAt: string }>(items: T[], timeZone?: string): MonthGroup<T>[] {
  const keyFormat = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "2-digit", timeZone });
  const labelFormat = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", timeZone });
  const groups: MonthGroup<T>[] = [];
  for (const item of items) {
    const date = new Date(item.takenAt);
    const parts = keyFormat.formatToParts(date);
    const key = `${parts.find((p) => p.type === "year")?.value}-${parts.find((p) => p.type === "month")?.value}`;
    const last = groups.at(-1);
    if (last?.key === key) last.items.push(item);
    else {
      const existing = groups.find((g) => g.key === key);
      if (existing) existing.items.push(item);
      else groups.push({ key, label: labelFormat.format(date), items: [item] });
    }
  }
  return groups;
}
