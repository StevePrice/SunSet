import type { Addition } from "@/lib/additions";
import { formatDuration } from "@/lib/story/voice";
import { RemoveButton } from "./afterglow/remove-button";
import { HearYourVoice } from "./recording";

// "Added to the story" (Phase 4f-4, Build Spec 2.6 and 2.9, pictures 22 and 26): what friends added
// on the Share Page, newest first, on Entry Detail and From your friends. Owner only.
export function AddedToStory({ entryId, additions, headingClass }: { entryId: string; additions: Addition[]; headingClass: string }) {
  if (additions.length === 0) return null;
  return (
    <section aria-labelledby="added-heading" className="flex flex-col gap-3">
      <h2 id="added-heading" className={headingClass}>
        Added to the story
      </h2>
      <ul className="flex flex-col gap-3">
        {additions.map((a) => (
          <li key={a.id} className="flex flex-col gap-3 rounded-ss-lg bg-surface-raised p-5">
            <h3 className="font-serif text-title-3">{a.name} added to the story</h3>
            {a.spoken && (
              <HearYourVoice
                clips={[`/api/additions/${a.id}`]}
                title={`Hear ${a.name} tell it`}
                subtitle={`${formatDuration(a.durationMs ?? 0)} · Private to you`}
                playLabel={`${a.name}'s recording`}
              />
            )}
            {a.text && <p className="ss-story whitespace-pre-wrap text-ink-story">&ldquo;{a.text}&rdquo;</p>}
            <div className="flex items-center justify-between gap-2">
              <p className="text-caption text-ink-muted">
                {a.spoken ? (a.transcribed ? "Spoken, written down by AI" : "Spoken") : "Written"}
                {!a.spoken && " · Private to you"}
              </p>
              <RemoveButton entryId={entryId} target={{ additionId: a.id }} label={`Remove what ${a.name} added`} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
