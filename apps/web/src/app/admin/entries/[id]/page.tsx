/* eslint-disable @next/next/no-img-element -- photos are private and served by /api/admin/photos. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEntryOwner, getUser, logAdminView, requireAdmin } from "@/lib/admin";
import { withDrizzle } from "@/lib/db";
import { getEntry } from "@/lib/entries";
import { formatLocation } from "@/lib/format";
import { getScore } from "@/lib/scores";
import { getShareForEntry } from "@/lib/shares";
import { getSession } from "@/lib/story/sessions";
import { LocalDate } from "@/components/local-date";
import { ScoreBreakdown } from "@/components/score-card";

// Read-only view of any entry, including the interview behind its story.
export default async function AdminEntryPage(props: PageProps<"/admin/entries/[id]">) {
  const { id } = await props.params;
  const admin = await requireAdmin();
  const found = await withDrizzle(async (db) => {
    const ownerId = await getEntryOwner(db, id);
    if (!ownerId) return null;
    await logAdminView(db, admin.id, ownerId, id);
    const [owner, entry, score, share, session] = await Promise.all([
      getUser(db, ownerId),
      getEntry(db, ownerId, id),
      getScore(db, ownerId, id),
      getShareForEntry(db, ownerId, id),
      getSession(db, ownerId, id),
    ]);
    return entry && owner ? { owner, entry, score, share, session } : null;
  });
  if (!found) notFound();
  const { owner, entry, score, share, session } = found;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <Link href={`/admin/users/${owner.id}`} className="text-sm underline">
        ← {owner.name.trim() || owner.email}&apos;s Journal
      </Link>
      <img
        src={`/api/admin/photos/${entry.id}/display`}
        alt={entry.title ?? entry.story ?? "A sunset"}
        width={entry.photoWidth}
        height={entry.photoHeight}
        className="h-auto w-full rounded-2xl"
      />
      <div className="flex flex-col gap-1">
        {entry.title && <h1 className="text-2xl font-semibold">{entry.title}</h1>}
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <LocalDate iso={entry.takenAt.toISOString()} />
          {entry.location && ` · ${formatLocation(entry.location)}`}
          {share && " · shared publicly"}
        </p>
      </div>
      {entry.story ? <p className="whitespace-pre-wrap text-lg leading-8">{entry.story}</p> : <p className="text-zinc-500">No story.</p>}
      {entry.caption && <p className="text-sm text-zinc-600 dark:text-zinc-400">Caption: {entry.caption}</p>}
      {score?.status === "done" ? (
        <ScoreBreakdown score={score} whose="the" />
      ) : (
        <p className="text-sm text-zinc-500">Score: {score?.status ?? "not scored with the current scorer"}</p>
      )}
      {session && session.turns.length > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="font-medium">Story interview</h2>
          <ol className="flex flex-col gap-3 text-sm">
            {session.turns.map((t, i) => (
              <li key={i}>
                <p className="text-zinc-500">{t.question ?? "(started without a question)"}</p>
                <p className="whitespace-pre-wrap">{t.answer}</p>
              </li>
            ))}
          </ol>
          {(session.sensitive || session.safetyConcern) && (
            <p className="text-sm text-amber-800">
              Flagged: {[session.sensitive && "sensitive", session.safetyConcern && "safety concern"].filter(Boolean).join(", ")}
            </p>
          )}
        </section>
      )}
    </main>
  );
}
