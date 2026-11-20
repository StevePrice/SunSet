import { notFound, redirect } from "next/navigation";
import { LocalDate } from "@/components/local-date";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { getEntry } from "@/lib/entries";
import { formatLocation } from "@/lib/format";
import { getStorySettings } from "@/lib/settings";
import { listClips } from "@/lib/story/clips";
import { assembleSaid, originalWords } from "@/lib/story/prompts";
import { getSession } from "@/lib/story/sessions";
import { StoryScreen } from "./story-screen";

/**
 * The story screen for an entry, from Add your story ("new") or Edit ("edit"). Shared by
 * /journal/[id]/story and /journal/[id]/edit. With AI story help off it's a plain typing box.
 */
export async function StoryScreenPage({ id, mode }: { id: string; mode: "new" | "edit" }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const found = await withDrizzle(async (db) => {
    const entry = await getEntry(db, user.id, id);
    if (!entry) return null;
    const [session, clips, settings] = await Promise.all([getSession(db, user.id, id), listClips(db, user.id, id), getStorySettings(db, user.id)]);
    return { entry, session, clips, settings };
  });
  if (!found) notFound();
  const { entry, session, clips, settings } = found;
  const turns = session?.turns ?? [];
  const spoken = turns.some((t) => t.via === "spoken");
  // The person's original words, kept private: "What you said" (spoken) or "What you wrote".
  const originalText = !turns.length
    ? null
    : spoken
      ? session?.said && session.said.turns === turns.length
        ? session.said.text
        : assembleSaid(turns, null)
      : originalWords(turns);
  const place = entry.location && formatLocation(entry.location);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-2 pb-8">
      <StoryScreen
        entryId={entry.id}
        mode={mode}
        dateLine={
          <>
            <LocalDate iso={entry.takenAt.toISOString()} />
            {place && ` · ${place}`}
          </>
        }
        initialStory={entry.story ?? ""}
        initialTitle={entry.title ?? ""}
        initialClips={clips.map((c) => ({ id: c.id, durationMs: c.durationMs }))}
        original={mode === "edit" && originalText ? { label: spoken ? "What you said" : "What you wrote", text: originalText } : null}
        hasLocation={entry.location !== null}
        aiHelp={settings?.aiStoryHelp ?? true}
        noticeSeen={settings?.noticeSeen ?? false}
      />
    </main>
  );
}
