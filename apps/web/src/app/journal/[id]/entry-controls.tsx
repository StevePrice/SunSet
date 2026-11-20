"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { Button } from "@/components/button";
import { fieldClass, noticeClass } from "@/components/styles";
import { deleteEntryAction, updateStoryAction } from "../actions";
import { MAX_STORY_LENGTH } from "@/lib/entry-input";

/**
 * The story box on the Edit page: always open; Save returns to Entry Detail. Part 4 of Phase 4e
 * replaces this page with the story screen in edit mode (Build Spec 3.8, B3d).
 */
export function EditStoryForm({ id, story, hasLocation }: { id: string; story: string | null; hasLocation: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof updateStoryAction>>, form: FormData) => {
    const result = await updateStoryAction(id, prev, form);
    if (!result) router.push(`/journal/${id}`);
    return result;
  }, null);

  return (
    <form action={action} className="flex flex-col gap-3">
      <label htmlFor="story" className="text-label font-bold">
        Your story
      </label>
      <textarea
        id="story"
        name="story"
        defaultValue={story ?? ""}
        maxLength={MAX_STORY_LENGTH}
        placeholder="Where were you, and what made you stop to take this?"
        className={`${fieldClass} ss-story min-h-60`}
      />
      {hasLocation && (
        <label className="flex min-h-12 items-center gap-3 text-label">
          <input type="checkbox" name="removeLocation" className="size-5" /> Remove the location
        </label>
      )}
      {state?.error && (
        <p role="alert" className={noticeClass}>
          {state.error}
        </p>
      )}
      <Button type="submit" variant="action" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

export function DeleteEntryButton({ id }: { id: string }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      className="inline-flex min-h-12 items-center self-start text-label text-ink-muted underline disabled:opacity-50"
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
