"use client";

import { useState, useTransition } from "react";
import { rescoreAllAction } from "./actions";

export function RescoreButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-3 text-caption">
      {message && <span className="text-ink-muted">{message}</span>}
      <button
        type="button"
        disabled={pending}
        className="inline-flex min-h-13 min-w-12 items-center justify-center gap-2 rounded-ss-md px-5 py-2 text-center text-label font-bold disabled:opacity-50 border border-border-subtle bg-transparent text-ink hover:bg-surface-raised"
        onClick={() =>
          start(async () => {
            const { queued } = await rescoreAllAction();
            setMessage(queued ? `Queued ${queued} sunsets for the current scorer.` : "Every sunset already has a current score.");
          })
        }
      >
        Score everything with the current scorer
      </button>
    </div>
  );
}
