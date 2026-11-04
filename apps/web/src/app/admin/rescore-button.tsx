"use client";

import { useState, useTransition } from "react";
import { rescoreAllAction } from "./actions";

export function RescoreButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-3 text-sm">
      {message && <span className="text-zinc-600 dark:text-zinc-400">{message}</span>}
      <button
        type="button"
        disabled={pending}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 disabled:opacity-50 dark:border-zinc-700"
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
