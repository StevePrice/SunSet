// "Download your sunsets" (Phase 7a user rights): what goes in the ZIP and what it's called.
// Kept free of database and storage code so it can be tested; app/api/export/route.ts streams it.
import type { Addition } from "@/lib/additions";
import type { Entry } from "@/lib/entries";
import type { Afterglow } from "@/lib/reactions";
import type { EntryScore } from "@/lib/scores";
import { REACTION_KINDS, REACTION_LABELS, reactionLabel, type ReactionKind } from "@/lib/reaction-input";
import type { listSetsForExport } from "@/lib/share-sets";

const isReactionKind = (k: string): k is ReactionKind => (REACTION_KINDS as readonly string[]).includes(k);

export type ExportClip = { id: string; r2Key: string; contentType: string; durationMs: number; transcript: string | null };

export type ExportSunset = {
  entry: Entry;
  score: EntryScore | null;
  afterglow: Afterglow | null;
  clips: ExportClip[];
  /** "What you said" / "What you wrote": the person's original words, if they told the story. */
  originalWords: string | null;
  /** Who's in it (names the owner added). */
  people?: string[];
  /** What friends added to the story (4f-4): their words. Their recordings stay in the app. */
  additions?: Addition[];
};

const EXTENSIONS: Record<string, string> = { "audio/webm": "webm", "audio/mp4": "m4a", "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/wav": "wav" };

export function audioExtension(contentType: string): string {
  return EXTENSIONS[contentType.split(";")[0].trim().toLowerCase()] ?? "audio";
}

/** "2026-08-22 Lone Trees After the Fire": sorts by date and survives every file system. */
export function sunsetFileName(entry: Pick<Entry, "id" | "takenAt" | "title" | "timeZone">): string {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: entry.timeZone ?? "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).format(entry.takenAt);
  const title = (entry.title ?? "")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  // The id's start keeps two untitled sunsets on the same day apart.
  return `${date} ${title || "Sunset"} ${entry.id.slice(0, 8)}`;
}

/** The files to put in the ZIP for one sunset, and its record in journal.json. */
export function exportSunset(sunset: ExportSunset) {
  const { entry, score, afterglow, clips, originalWords, people = [], additions = [] } = sunset;
  const base = sunsetFileName(entry);
  const photo = `photos/${base}.jpg`;
  const recordings = clips.map((clip, i) => ({
    clip,
    path: `recordings/${base}${clips.length > 1 ? ` part ${i + 1}` : ""}.${audioExtension(clip.contentType)}`,
  }));
  const record = {
    title: entry.title,
    takenAt: entry.takenAt.toISOString(),
    timeZone: entry.timeZone,
    place: entry.placeName,
    location: entry.location,
    story: entry.story,
    people,
    originalWords,
    photo,
    recordings: recordings.map(({ clip, path }) => ({ file: path, seconds: Math.round(clip.durationMs / 1000), transcript: clip.transcript })),
    score:
      score?.status === "done"
        ? { outOf100: score.displayScore, palette: score.palette, reach: score.reach, setting: score.setting, wowFactor: score.wow, wowReason: score.wowReason }
        : null,
    fromFriends: (afterglow?.people ?? []).map((person) => ({
      name: person.name,
      reactions: person.reactions.map((r) => REACTION_LABELS[r.kind]),
      note: person.note?.body ?? null,
    })),
    addedToTheStory: additions.map((a) => ({ name: a.name, words: a.text, spoken: a.spoken, sentAt: a.sentAt.toISOString() })),
  };
  return { photo, recordings, record };
}

/** Sunsets you sent someone as one link (4f-5), each sunset named by its photo's file name. */
export function exportSets(sets: Awaited<ReturnType<typeof listSetsForExport>>, photoOf: Map<string, string>) {
  return sets.map((set) => ({
    sharedWith: set.sharedWith,
    sharedAt: set.sharedAt,
    stoppedSharingAt: set.stoppedAt,
    sunsets: set.entryIds.flatMap((id) => photoOf.get(id) ?? []),
    // A set is always for the named person, so "Wish I was there" is their "I was there!".
    reactions: set.reactions.flatMap((r) => (isReactionKind(r.kind) ? [{ name: r.from, reaction: reactionLabel(r.kind, true) }] : [])),
    notes: set.notes.map((n) => ({ name: n.from, note: n.note })),
  }));
}

export const EXPORT_README = `Your sunsets from Sunset Soul

photos/      every photo, named by the date it was taken and its title
recordings/  your voice recordings, where you told a story out loud
journal.json every sunset's title, date, place, who was there, story, your original words, its score and what
             friends sent (reactions, notes and what they added to the story), linked to its photo and recordings by file name,
             and the sunsets you sent someone together as one link, with their replies

journal.json is plain text: any text editor opens it, and spreadsheet apps can import it.
`;
