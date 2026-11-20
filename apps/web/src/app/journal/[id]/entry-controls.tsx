"use client";

import { useState } from "react";
import { deleteEntryAction } from "../actions";

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
