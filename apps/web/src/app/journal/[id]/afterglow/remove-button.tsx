"use client";

import { useState } from "react";
import { deleteAdditionAction, deleteReactionAction, deleteReactionNoteAction } from "../../actions";

/** Deletes one reaction, note, or addition to the story (4f-4), after a confirm. */
export function RemoveButton({
  entryId,
  target,
  label,
}: {
  entryId: string;
  target: { reactionId: string } | { noteId: string } | { additionId: string };
  label: string;
}) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={label}
      className="min-h-12 px-2 text-label text-ink-muted underline disabled:opacity-50"
      onClick={async () => {
        if (!confirm(`${label}? This can't be undone.`)) return;
        setPending(true);
        if ("reactionId" in target) await deleteReactionAction(entryId, target.reactionId);
        else if ("noteId" in target) await deleteReactionNoteAction(entryId, target.noteId);
        else await deleteAdditionAction(entryId, target.additionId);
        setPending(false);
      }}
    >
      Remove
    </button>
  );
}
