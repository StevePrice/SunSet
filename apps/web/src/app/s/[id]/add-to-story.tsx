"use client";

// Add to the story (Phase 4f-4, PRD 6.10e, Build Spec 2.8, picture 25): the card on the Share Page
// where a friend types what they'd like to add, or says it (up to 1 minute). The recording is
// uploaded as soon as it stops, so its words can come back for the friend to read and change; the
// Share Page's one Send button sends it. The state lives in the parent (reactions.tsx).
import { useEffect, useId, useRef, useState } from "react";
import { fieldClass, noticeClass } from "@/components/styles";
import { MAX_ADDITION_LENGTH, MAX_ADDITION_SECONDS } from "@/lib/addition-input";
import { formatDuration, pickRecorderMime } from "@/lib/story/voice";
import { HearYourVoice } from "@/app/journal/[id]/recording";
import { MicIcon, RecordingScreen, useVoiceRecorder, VoiceStatus } from "@/app/journal/[id]/story/voice-recorder";

export type AdditionDraft = {
  mode: "type" | "say";
  text: string;
  /** A recording is stored for this friend (waiting for Send, or sent). */
  clip: { durationMs: number; url: string | null } | null;
  /** The words came back from speech-to-text and haven't been sent yet. */
  heard: boolean;
};

function TypeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden width={20} height={20} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  );
}

export function AddToStory({
  shareId,
  ownerName,
  personal,
  draft,
  onChange,
  ensureName,
  recordFields,
  disabled,
}: {
  shareId: string;
  ownerName: string;
  /** A personal link: the person was there, so the heading doesn't ask. */
  personal: boolean;
  draft: AdditionDraft;
  /** Takes an update, since the recorder's callbacks run long after the render that started them. */
  onChange: (update: (draft: AdditionDraft) => AdditionDraft) => void;
  /** Runs `then` once the friend has given a first name (asks for it if needed). */
  ensureName: (then: () => void) => void;
  /** The first name or personal link, sent with a recording so the server knows who it's from. */
  recordFields: () => Record<string, string>;
  disabled: boolean;
}) {
  const ids = useId();
  // Some in-app browsers (Facebook, Instagram, messaging apps) and older phones can't record.
  // Checked after the first render, so the server and browser draw the same page first.
  const [canRecord, setCanRecord] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  useEffect(() => {
    const supported =
      typeof MediaRecorder !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      pickRecorderMime((t) => MediaRecorder.isTypeSupported(t)) !== null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only check, once.
    setCanRecord(supported);
  }, []);

  // The friend's own recording, played back from the phone (it's never served back to them).
  const playback = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (playback.current) URL.revokeObjectURL(playback.current);
    },
    [],
  );
  const voice = useVoiceRecorder({
    uploadUrl: `/s/${shareId}/additions/clip`,
    fields: recordFields,
    maxSeconds: MAX_ADDITION_SECONDS,
    onRecorded: (blob) => {
      if (playback.current) URL.revokeObjectURL(playback.current);
      playback.current = URL.createObjectURL(blob);
    },
    // Record again replaces the words with the new recording's.
    onClip: ({ durationMs }) => onChange((d) => ({ ...d, mode: "say", clip: { durationMs, url: playback.current }, text: "", heard: false })),
    onTranscript: (text) => onChange((d) => ({ ...d, text, heard: true })),
    onTypeInstead: (message) => {
      if (message) {
        setVoiceNote(message);
        setCanRecord(false);
      }
      onChange((d) => ({ ...d, mode: "type" }));
    },
  });

  const busy = disabled || voice.state.kind === "uploading" || voice.state.kind === "starting";
  const heading = personal ? "Add to the story" : "Were you there? Add to the story.";
  const line = personal
    ? `What do you remember about this night? Only ${ownerName} will read or hear it.`
    : `Or share a memory it brings back. Only ${ownerName} will read or hear it.`;

  function record() {
    setVoiceNote(null);
    ensureName(() => void voice.start());
  }

  const tab = (selected: boolean) =>
    `flex min-h-12 flex-1 items-center justify-center gap-2 rounded-ss-pill px-4 text-label font-bold ${
      selected ? "bg-ink text-surface" : "text-ink"
    }`;

  return (
    <section aria-labelledby={`${ids}-heading`} className="flex flex-col gap-4 rounded-ss-lg bg-surface-raised p-5">
      <div className="flex flex-col gap-2">
        <h2 id={`${ids}-heading`} className="font-serif text-title-3">
          {heading}
        </h2>
        <p>{line}</p>
      </div>

      {canRecord && (
        <div role="radiogroup" aria-label="How to add to the story" className="flex gap-1 rounded-ss-pill border-[1.5px] border-border-subtle bg-surface p-1">
          <button type="button" role="radio" aria-checked={draft.mode === "type"} className={tab(draft.mode === "type")} onClick={() => onChange((d) => ({ ...d, mode: "type" }))}>
            <TypeIcon />
            Type it
          </button>
          <button type="button" role="radio" aria-checked={draft.mode === "say"} className={tab(draft.mode === "say")} onClick={() => onChange((d) => ({ ...d, mode: "say" }))}>
            <MicIcon size={20} />
            Say it
          </button>
        </div>
      )}

      {draft.mode === "type" || !canRecord ? (
        <>
          <label htmlFor={`${ids}-text`} className="sr-only">
            What you&apos;d like to add
          </label>
          <textarea
            id={`${ids}-text`}
            value={draft.text}
            onChange={(e) => {
              const text = e.target.value;
              onChange((d) => ({ ...d, text }));
            }}
            maxLength={MAX_ADDITION_LENGTH}
            rows={4}
            disabled={disabled}
            className={`${fieldClass} ss-story min-h-28 resize-y`}
          />
          <p className="text-caption text-ink-muted">
            Saying it works for up to 1 minute. If your phone can&apos;t record here, you can still type.
          </p>
        </>
      ) : !draft.clip ? (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <button
            type="button"
            onClick={record}
            disabled={busy}
            aria-label="Start recording"
            className="flex size-20 items-center justify-center rounded-ss-pill bg-action text-on-action hover:bg-action/90 disabled:opacity-50"
          >
            <MicIcon size={32} />
          </button>
          <p className="text-label font-bold">Tap to record</p>
          <p className="text-caption text-ink-muted">Up to 1 minute. Your phone will ask to use the microphone.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {draft.clip.url ? (
            <HearYourVoice
              key={draft.clip.url}
              clips={[draft.clip.url]}
              title="What you said"
              subtitle={`${formatDuration(draft.clip.durationMs)} of 1:00`}
            />
          ) : (
            <p className="text-label font-bold">Your recording · {formatDuration(draft.clip.durationMs)} of 1:00</p>
          )}
          <button type="button" onClick={record} disabled={busy} className="inline-flex min-h-12 items-center self-start text-label underline">
            Record again
          </button>
          <label htmlFor={`${ids}-words`} className="text-caption text-ink-muted">
            {draft.text || draft.heard ? "Here are your words. Change anything you like." : "Add your words if you like, so they're easy to read."}
          </label>
          <textarea
            id={`${ids}-words`}
            value={draft.text}
            onChange={(e) => {
              const text = e.target.value;
              onChange((d) => ({ ...d, text }));
            }}
            maxLength={MAX_ADDITION_LENGTH}
            rows={4}
            disabled={disabled}
            className={`${fieldClass} ss-story min-h-28 resize-y`}
          />
        </div>
      )}

      {voice.state.kind === "transcribeFailed" ? (
        <p role="status" className={noticeClass}>
          We couldn&apos;t turn that into words, but your recording is saved. You can type what you said, or send it as it is.
        </p>
      ) : (
        <VoiceStatus state={voice.state} canRetry={false} onRetry={() => void voice.retry()} onTypeInstead={voice.typeInstead} />
      )}
      {voiceNote && (
        <p role="status" className={noticeClass}>
          {voiceNote}
        </p>
      )}

      {voice.state.kind === "recording" && (
        <RecordingScreen
          elapsedMs={voice.state.elapsedMs}
          onStop={voice.stop}
          onCancel={voice.cancel}
          limitLabel="1 minute"
          header={<h2 className="font-serif text-title-2">Add to the story</h2>}
        />
      )}
    </section>
  );
}
