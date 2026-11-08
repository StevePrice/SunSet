"use client";

import { useActionState, useState } from "react";
import { deleteEntryAction, updateStoryAction } from "../actions";
import { MAX_STORY_LENGTH } from "@/lib/entry-input";

export function EditStoryForm({ id, story, hasLocation }: { id: string; story: string | null; hasLocation: boolean }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof updateStoryAction>>, form: FormData) => {
    const result = await updateStoryAction(id, prev, form);
    if (!result) setEditing(false);
    return result;
  }, null);

  if (!editing) {
    return (
      <section className="flex flex-col gap-2">
        {story ? <p className="ss-story whitespace-pre-wrap text-ink-story">{story}</p> : <p className="text-ink-muted">No story yet.</p>}
        <button type="button" className="inline-flex min-h-12 items-center self-start text-label underline" onClick={() => setEditing(true)}>
          {story ? "Edit the story" : "Add a story"}
        </button>
      </section>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <textarea
        name="story"
        defaultValue={story ?? ""}
        maxLength={MAX_STORY_LENGTH}
        placeholder="What was happening when you took this?"
        className="min-h-32 ss-story min-h-12 w-full min-w-0 rounded-ss-md border border-border-subtle bg-surface-raised px-3 py-2 text-ink placeholder:text-ink-muted"
      />
      {hasLocation && (
        <label className="flex items-center gap-2 text-caption">
          <input type="checkbox" name="removeLocation" /> Remove the location
        </label>
      )}
      {state?.error && <p role="alert" className="rounded-ss-md border border-border-subtle bg-surface-raised p-3 text-ink">{state.error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="inline-flex min-h-13 min-w-12 items-center justify-center gap-2 rounded-ss-md px-5 py-2 text-center text-label font-bold disabled:opacity-50 bg-action text-on-action hover:bg-action/90">
          Save
        </button>
        <button type="button" className="inline-flex min-h-13 min-w-12 items-center justify-center gap-2 rounded-ss-md px-5 py-2 text-center text-label font-bold disabled:opacity-50 border border-border-subtle bg-transparent text-ink hover:bg-surface-raised" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function DeleteEntryButton({ id }: { id: string }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      className="inline-flex min-h-12 items-center self-start text-label underline disabled:opacity-50"
      onClick={async () => {
        if (!confirm("Delete this sunset from your Journal? This can't be undone.")) return;
        setPending(true);
        await deleteEntryAction(id);
      }}
    >
      Delete this sunset
    </button>
  );
}
