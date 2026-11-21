"use client";

// Voice for the story screen (Phase 4e, Build Spec 3.8). Records in the browser, uploads the clip,
// and hands back the transcript. The clip is saved on the server before transcription, so if
// Whisper fails the person can retry on the stored clip (no re-recording) or type instead, and the
// recording is never lost.
//
// - useVoiceRecorder: the recording itself (start, stop, cancel, retry);
// - RecordingScreen (B3c): Cancel, LISTENING, the timer, a moving line, a big Stop button;
// - VoiceStatus: "Turning your words into text…", or what went wrong with Retry and Type instead;
// - MicNote (B3b): the bottom sheet before the browser's microphone prompt, once per person.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { buttonClass } from "@/components/button";
import { noticeClass } from "@/components/styles";
import { formatDuration, MAX_RECORDING_SECONDS, pickRecorderMime } from "@/lib/story/voice";
import { retryTranscriptionAction } from "./actions";

export type VoiceState =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "recording"; elapsedMs: number }
  | { kind: "uploading" }
  | { kind: "uploadFailed"; blob: Blob; durationMs: number }
  | { kind: "transcribeFailed"; clipId: string; message: string }
  | { kind: "retrying"; clipId: string };

const TRANSCRIBE_FAILED = "We couldn't turn that into text.";
const CANT_RECORD = "This browser can't record audio. You can type your story instead.";
export const MIC_DENIED =
  "Sunset Soul can't use your microphone. You can type your story instead, or allow the microphone in your phone's settings.";

export function MicIcon({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
    </svg>
  );
}

export function useVoiceRecorder({
  entryId,
  onClip,
  onTranscript,
  onTypeInstead,
}: {
  entryId: string;
  /** Every clip saved on the server, transcribed or not. */
  onClip: (clip: { id: string; durationMs: number }) => void;
  /** The transcript, with the clip it came from. */
  onTranscript: (text: string, clipId: string) => void;
  /** Voice can't be used (or the person chose to type); `message` says why. */
  onTypeInstead: (message?: string) => void;
}) {
  const [state, setState] = useState<VoiceState>({ kind: "idle" });
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef(0);
  const discard = useRef(false);
  const unmounted = useRef(false);

  function release() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }

  useEffect(
    () => () => {
      unmounted.current = true;
      if (recorder.current?.state === "recording") {
        recorder.current.onstop = null;
        recorder.current.stop();
      }
      release();
    },
    [],
  );

  async function upload(blob: Blob, durationMs: number) {
    setState({ kind: "uploading" });
    const body = new FormData();
    body.set("audio", blob, "answer");
    body.set("durationMs", String(durationMs));
    const response = await fetch(`/api/entries/${entryId}/clips`, { method: "POST", body }).catch(() => null);
    const reply = (await response?.json().catch(() => null)) as
      | { clipId?: string; transcript?: string; transcribeError?: string; error?: string }
      | null;
    if (!response?.ok || !reply?.clipId) {
      if (response?.status === 403 && reply?.error) {
        setState({ kind: "idle" });
        onTypeInstead(reply.error);
        return;
      }
      setState({ kind: "uploadFailed", blob, durationMs });
      return;
    }
    onClip({ id: reply.clipId, durationMs });
    if (reply.transcript) {
      setState({ kind: "idle" });
      onTranscript(reply.transcript, reply.clipId);
    } else {
      const message =
        reply.transcribeError === "limited"
          ? "You've reached today's limit for story help, so we couldn't turn that into text."
          : TRANSCRIBE_FAILED;
      setState({ kind: "transcribeFailed", clipId: reply.clipId, message });
    }
  }

  async function start() {
    const mime = typeof MediaRecorder === "undefined" ? null : pickRecorderMime((t) => MediaRecorder.isTypeSupported(t));
    if (!mime || !navigator.mediaDevices?.getUserMedia) {
      onTypeInstead(CANT_RECORD);
      return;
    }
    setState({ kind: "starting" });
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setState({ kind: "idle" });
      onTypeInstead(MIC_DENIED);
      return;
    }
    // The page was left while the permission prompt was open: turn the mic straight back off.
    if (unmounted.current) {
      release();
      return;
    }
    const chunks: Blob[] = [];
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream.current, { mimeType: mime });
    } catch {
      release();
      setState({ kind: "idle" });
      onTypeInstead(CANT_RECORD);
      return;
    }
    recorder.current = rec;
    discard.current = false;
    rec.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    rec.onstop = () => {
      const durationMs = Date.now() - startedAt.current;
      release();
      const blob = new Blob(chunks, { type: rec.mimeType || mime });
      if (discard.current || !blob.size) {
        setState({ kind: "idle" });
        return;
      }
      void upload(blob, durationMs);
    };
    startedAt.current = Date.now();
    try {
      rec.start(1000);
    } catch {
      release();
      setState({ kind: "idle" });
      onTypeInstead(CANT_RECORD);
      return;
    }
    setState({ kind: "recording", elapsedMs: 0 });
    timer.current = setInterval(() => {
      const elapsedMs = Date.now() - startedAt.current;
      // At 2 minutes, recording stops on its own.
      if (elapsedMs >= MAX_RECORDING_SECONDS * 1000) stop();
      else setState({ kind: "recording", elapsedMs });
    }, 250);
  }

  function stop() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  /** Cancel on the recording screen: stops and throws the recording away. */
  function cancel() {
    discard.current = true;
    stop();
  }

  async function retry() {
    if (state.kind === "uploadFailed") return upload(state.blob, state.durationMs);
    if (state.kind !== "transcribeFailed") return;
    const clipId = state.clipId;
    setState({ kind: "retrying", clipId });
    const result = await retryTranscriptionAction(entryId, clipId).catch(() => ({ error: TRANSCRIBE_FAILED }));
    if ("transcript" in result) {
      setState({ kind: "idle" });
      onTranscript(result.transcript, clipId);
    } else {
      setState({ kind: "transcribeFailed", clipId, message: result.error });
    }
  }

  function typeInstead() {
    setState({ kind: "idle" });
    onTypeInstead();
  }

  return { state, start, stop, cancel, retry, typeInstead };
}

/** Recording (B3c): fills the screen, so the box and buttons underneath can't be tapped mid-recording. */
export function RecordingScreen({
  elapsedMs,
  onStop,
  onCancel,
  header,
}: {
  elapsedMs: number;
  onStop: () => void;
  onCancel: () => void;
  /** The thumbnail with date and place, and the heading, as on the story screen. */
  header: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-surface" role="dialog" aria-modal="true" aria-labelledby="listening">
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-6 px-4 pt-2 pb-8">
        <button type="button" onClick={onCancel} className="inline-flex min-h-12 items-center self-start text-label font-bold">
          Cancel
        </button>
        {header}
        <div className="flex flex-col items-center gap-5 rounded-ss-lg bg-surface-raised px-5 py-8 text-center">
          <p id="listening" className="text-caption font-bold tracking-widest text-ink-muted uppercase">
            Listening
          </p>
          <p className="text-display leading-none font-bold tabular-nums" aria-hidden>
            {formatDuration(elapsedMs)}
          </p>
          <svg aria-hidden viewBox="0 0 240 40" className="ss-listening h-10 w-full max-w-xs" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M4 20h20c6 0 6-14 12-14s6 28 12 28 6-24 12-24 6 20 12 20 6-14 12-14 6 10 12 10h20M196 20h40" />
          </svg>
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop recording"
            className="flex size-24 items-center justify-center rounded-ss-pill bg-action text-on-action hover:bg-action/90"
          >
            <span aria-hidden className="size-7 rounded-ss-sm bg-on-action" />
          </button>
          <p className="text-label font-bold">Tap to stop</p>
          <p className="text-caption text-ink-muted">Take your time. Pauses are fine. Up to 2 minutes.</p>
        </div>
        <p className="mt-auto text-center text-caption text-ink-muted">When you stop, your words appear so you can read and change them.</p>
      </div>
    </div>
  );
}

/** Uploading, transcribing, or what went wrong (Retry, Type instead). Nothing when idle or recording. */
export function VoiceStatus({ state, onRetry, onTypeInstead }: { state: VoiceState; onRetry: () => void; onTypeInstead: () => void }) {
  if (state.kind === "uploading" || state.kind === "retrying") {
    return (
      <p role="status" className="animate-pulse rounded-ss-lg bg-surface-raised p-5 text-center text-ink-muted">
        Turning your words into text…
      </p>
    );
  }
  if (state.kind !== "transcribeFailed" && state.kind !== "uploadFailed") return null;
  return (
    <div role="alert" className={`${noticeClass} flex flex-col gap-3`}>
      <p>
        {state.kind === "uploadFailed"
          ? "We couldn't save that recording. Check your connection and try again."
          : `${state.message} Your recording is saved.`}
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className={buttonClass("secondary")} onClick={onRetry}>
          Retry
        </button>
        <button type="button" className={buttonClass("secondary")} onClick={onTypeInstead}>
          Type instead
        </button>
      </div>
    </div>
  );
}

/** A bottom sheet over a dimmed screen (the microphone note and the first-use AI notice). */
export function BottomSheet({ labelledBy, children }: { labelledBy: string; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-photo-scrim" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <div className="mx-auto flex max-h-full w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-t-ss-lg bg-surface-raised px-5 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  );
}

/** The microphone note (B3b), before the browser's prompt, once per person. */
export function MicNote({ onContinue, onTypeInstead }: { onContinue: () => void; onTypeInstead: () => void }) {
  return (
    <BottomSheet labelledBy="mic-note-title">
      <span className="flex size-14 items-center justify-center self-center rounded-ss-pill border-[1.5px] border-border-subtle bg-surface">
        <MicIcon size={28} />
      </span>
      <h2 id="mic-note-title" className="text-center font-serif text-title-2">
        Tell it in your own voice
      </h2>
      <p>Your phone will ask if Sunset Soul can use the microphone. Tap Allow.</p>
      <p>Your recording stays private. Friends never hear it.</p>
      <p>AI turns what you say into text you can change.</p>
      <button type="button" onClick={onContinue} className={buttonClass("action", "w-full")}>
        Continue
      </button>
      <button type="button" onClick={onTypeInstead} className="inline-flex min-h-12 items-center self-center text-label underline">
        Type instead
      </button>
    </BottomSheet>
  );
}
