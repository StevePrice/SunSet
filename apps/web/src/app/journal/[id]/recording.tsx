"use client";

import { useEffect, useState, useTransition } from "react";
import { deleteRecordingAction } from "../actions";
import { saidAction } from "./story/actions";

/** "What you said": saved once made; made on first view otherwise (Story Capture PRD 6.5a). */
export function WhatYouSaid({ entryId, initial, fallback }: { entryId: string; initial: string | null; fallback: string }) {
  const [text, setText] = useState(initial);
  useEffect(() => {
    if (initial !== null) return;
    let live = true;
    saidAction(entryId)
      .then((result) => live && setText(result?.text ?? fallback))
      .catch(() => live && setText(fallback));
    return () => {
      live = false;
    };
  }, [entryId, initial, fallback]);
  if (text === null) return <p className="animate-pulse text-ink-muted">Tidying up your words…</p>;
  return <p className="whitespace-pre-wrap text-ink-story">{text}</p>;
}

export function DeleteRecordingButton({ entryId, count }: { entryId: string; count: number }) {
  const [pending, startPending] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="inline-flex min-h-12 items-center self-start text-label underline disabled:opacity-50"
      onClick={() => {
        const what = count === 1 ? "this recording" : `these ${count} recordings`;
        if (!confirm(`Delete ${what}? Your story and what you said are kept. This can't be undone.`)) return;
        startPending(() => deleteRecordingAction(entryId));
      }}
    >
      {pending ? "Deleting…" : count === 1 ? "Delete recording" : "Delete recordings"}
    </button>
  );
}
