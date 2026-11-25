import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader, BottomBar } from "@/components/app-nav";
import { LocalDate } from "@/components/local-date";
import { PhotoCard } from "@/components/photo-card";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { listEntries } from "@/lib/entries";
import { entriesWithName, parseName } from "@/lib/people";

export const metadata = { title: "Sunsets together · Sunset Soul" };

// Sunsets with [Name] (Build Spec 2.3, picture 19): every sunset the owner put this name on,
// newest first. Owner-only. "Send [Name] all your sunsets together" comes with shared sets (4f-5).
export default async function SunsetsWithPage(props: PageProps<"/journal/people/[name]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const raw = (await props.params).name;
  // Next may hand the segment over still encoded; a name with a "%" in it must not throw.
  const asked = parseName(safeDecode(raw));
  if (!asked) notFound();
  const { name, entries } = await withDrizzle(async (db) => {
    const [all, found] = await Promise.all([listEntries(db, user.id), entriesWithName(db, user.id, asked)]);
    return { name: found.name, entries: all.filter((e) => found.entryIds.has(e.id)) };
  });
  if (!entries.length) notFound();
  const first = entries.at(-1)!;
  const since = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: first.timeZone ?? undefined }).format(first.takenAt);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pt-2 pb-8">
      <AppHeader back={{ href: "/journal?show=people", label: "Journal" }} />
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-title-1">Sunsets with {name}</h1>
        <p className="text-caption text-ink-muted">
          {entries.length === 1 ? "1 sunset together" : `${entries.length} sunsets together, since ${since}`}
        </p>
      </div>
      <ul className="flex flex-col gap-8">
        {entries.map((entry) => (
          <li key={entry.id}>
            <Link href={`/journal/${entry.id}`} className="group flex flex-col gap-2">
              <PhotoCard
                src={`/api/photos/${entry.id}/display`}
                alt={entry.title ?? entry.story ?? `A sunset with ${name}`}
                width={entry.photoWidth}
                height={entry.photoHeight}
                loading="lazy"
                className="group-hover:opacity-90"
              />
              <span className="mt-1 text-caption text-ink-muted">
                <LocalDate iso={entry.takenAt.toISOString()} timeZone={entry.timeZone} />
                {entry.placeName && ` · ${entry.placeName}`}
              </span>
              {entry.title && <span className="font-serif text-title-3">{entry.title}</span>}
              {entry.story && <span className="ss-story line-clamp-2 whitespace-pre-line text-ink-story">{entry.story}</span>}
            </Link>
          </li>
        ))}
      </ul>
      <BottomBar current="journal" />
    </main>
  );
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
