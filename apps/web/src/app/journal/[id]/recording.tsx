"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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

/**
 * "Hear it in your own voice · 0:48" on Entry Detail (Build Spec 3.6): one play button for the
 * whole story, playing its recordings one after another. Owner only; never on the Share Page.
 */
export function HearYourVoice({ clips, duration }: { clips: string[]; duration: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const partRef = useRef(0);
  const [playing, setPlaying] = useState(false);

  // Stop playing when leaving the page.
  useEffect(() => () => audioRef.current?.pause(), []);

  /** The one audio element, made on the first tap; moves on to the next recording when one ends. */
  function player(): HTMLAudioElement {
    if (audioRef.current) return audioRef.current;
    const audio = new Audio(clips[0]);
    audio.addEventListener("ended", () => {
      if (partRef.current + 1 < clips.length) {
        partRef.current += 1;
        audio.src = clips[partRef.current];
        void audio.play();
      } else {
        partRef.current = 0;
        audio.src = clips[0];
        setPlaying(false);
      }
    });
    audioRef.current = audio;
    return audio;
  }

  function toggle() {
    const audio = player();
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    void audio.play().then(
      () => setPlaying(true),
      () => setPlaying(false),
    );
  }

  return (
    <div className="flex items-center gap-4 rounded-ss-lg bg-surface-raised p-4">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause your recording" : "Play your recording"}
        className="flex size-12 shrink-0 items-center justify-center rounded-ss-pill border-[1.5px] border-border-subtle bg-surface text-ink"
      >
        <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          {playing ? <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /> : <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />}
        </svg>
      </button>
      <div className="flex flex-col">
        <p className="text-label font-bold">
          Hear it in your own voice · <span className="tabular-nums">{duration}</span>
        </p>
        <p className="text-caption text-ink-muted">Only you can hear it</p>
      </div>
    </div>
  );
}
