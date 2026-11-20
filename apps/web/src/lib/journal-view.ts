// The Journal's two views (design system): Stories (photo cards with their stories) and All photos
// (a two-column grid grouped by month). The view lives in the URL (?view=stories or ?view=photos)
// so it survives reloads and back navigation. Plain /journal opens the view the person used last
// (Build Spec 3.2), remembered in a cookie on the device; Stories the first time.

export type JournalView = "stories" | "photos";

export const JOURNAL_VIEW_COOKIE = "ss_journal_view";

function isView(value: unknown): value is JournalView {
  return value === "stories" || value === "photos";
}

/** The view from the URL, else the last one used, else Stories. */
export function parseJournalView(value: string | string[] | undefined, remembered?: string): JournalView {
  if (isView(value)) return value;
  return isView(remembered) ? remembered : "stories";
}

export function journalViewHref(view: JournalView): string {
  return `/journal?view=${view}`;
}

export type MonthGroup<T> = { key: string; label: string; items: T[] };

/**
 * Groups items (newest first, as the Journal lists them) under month headings such as
 * "November 2026", by the month their date falls in in `timeZone`. Dates are shown in the
 * viewer's time zone, so grouping uses it too: a sunset late on 31 October UTC that the viewer
 * sees as 1 November goes under November.
 */
export function groupByMonth<T extends { takenAt: string; timeZone?: string | null }>(items: T[], timeZone?: string): MonthGroup<T>[] {
  // Each entry's month in its own time zone when it has one (the one date rule), else `timeZone`.
  const formats = new Map<string, { key: Intl.DateTimeFormat; label: Intl.DateTimeFormat }>();
  const formatsFor = (zone: string | undefined) => {
    const id = zone ?? "";
    let f = formats.get(id);
    if (!f) {
      f = {
        key: new Intl.DateTimeFormat("en-US", { year: "numeric", month: "2-digit", timeZone: zone }),
        label: new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", timeZone: zone }),
      };
      formats.set(id, f);
    }
    return f;
  };
  const groups: MonthGroup<T>[] = [];
  for (const item of items) {
    const date = new Date(item.takenAt);
    const { key: keyFormat, label: labelFormat } = formatsFor(item.timeZone ?? timeZone);
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
