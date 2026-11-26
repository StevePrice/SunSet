"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * One play button for a story's recordings, played one after another: "Hear it in your own voice"
 * on Entry Detail and "Your recording" on the story screen. Also "Hear Louise tell it" on the Share Page, when the owner turned on Include my voice (4f-3).
 */
export function HearYourVoice({
  clips,
  title,
  subtitle,
  action,
  playLabel = "your recording",
}: {
  clips: string[];
  /** Whose recording, for screen readers: "Play Steve's recording". */
  playLabel?: string;
  title: ReactNode;
  subtitle: ReactNode;
  /** Something on the right of the row, e.g. "Add more" on the story screen. */
  action?: ReactNode;
}) {
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
        aria-label={`${playing ? "Pause" : "Play"} ${playLabel}`}
        className="flex size-12 shrink-0 items-center justify-center rounded-ss-pill border-[1.5px] border-border-subtle bg-surface text-ink"
      >
        <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          {playing ? <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /> : <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />}
        </svg>
      </button>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-label font-bold">{title}</p>
        <p className="text-caption text-ink-muted">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
