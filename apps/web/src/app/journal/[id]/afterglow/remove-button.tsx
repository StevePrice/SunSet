"use client";

import { useState } from "react";
import { deleteReactionAction, deleteReactionNoteAction } from "../../actions";

/** Deletes one reaction or note from Afterglow, after a confirm. */
export function RemoveButton({
  entryId,
  target,
  label,
}: {
  entryId: string;
  target: { reactionId: string } | { noteId: string };
  label: string;
}) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={label}
      className="min-h-12 px-2 text-base underline disabled:opacity-50"
      onClick={async () => {
        if (!confirm(`${label}? This can't be undone.`)) return;
        setPending(true);
        if ("reactionId" in target) await deleteReactionAction(entryId, target.reactionId);
        else await deleteReactionNoteAction(entryId, target.noteId);
        setPending(false);
      }}
    >
      Remove
    </button>
  );
}
