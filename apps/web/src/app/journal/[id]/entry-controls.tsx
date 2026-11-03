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
        {story ? <p className="whitespace-pre-wrap text-lg leading-8">{story}</p> : <p className="text-zinc-500">No story yet.</p>}
        <button type="button" className="self-start text-sm underline" onClick={() => setEditing(true)}>
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
        className="min-h-32 rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
      />
      {hasLocation && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="removeLocation" /> Remove the location
        </label>
      )}
      {state?.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="rounded-lg bg-orange-600 px-4 py-2 font-medium text-white disabled:opacity-50">
          Save
        </button>
        <button type="button" className="rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700" onClick={() => setEditing(false)}>
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
      className="self-start text-sm text-red-700 underline disabled:opacity-50"
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
