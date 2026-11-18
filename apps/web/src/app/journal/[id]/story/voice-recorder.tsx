"use client";

// Records one spoken answer in the browser, uploads it, and hands back the transcript. The clip
// is saved on the server before transcription, so if Whisper fails the user can retry on the
// stored clip (no re-recording) or type instead, and the recording is never lost.
import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/button";
import { noticeClass } from "@/components/styles";
import { formatDuration, MAX_RECORDING_SECONDS, pickRecorderMime } from "@/lib/story/voice";
import { retryTranscriptionAction } from "./actions";

type State =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "recording"; elapsedMs: number }
  | { kind: "uploading" }
  | { kind: "uploadFailed"; blob: Blob; durationMs: number }
  | { kind: "transcribeFailed"; clipId: string; message: string }
  | { kind: "retrying"; clipId: string };

const TRANSCRIBE_FAILED = "We couldn't turn that into text.";

export function MicIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

export function VoiceRecorder({
  entryId,
  prominent,
  label,
  disabled,
  onClip,
  onTranscript,
  onTypeInstead,
  onActiveChange,
}: {
  entryId: string;
  /** The big primary mic button, or a smaller secondary one ("Add more by voice"). */
  prominent: boolean;
  label: string;
  disabled?: boolean;
  /** Called for every clip saved on the server, transcribed or not. */
  onClip: (clipId: string) => void;
  onTranscript: (text: string) => void;
  /** Switch to typing, with a message saying why when voice can't be used. */
  onTypeInstead: (message?: string) => void;
  /** True while recording or uploading, so the answer can't be sent half-recorded. */
  onActiveChange?: (active: boolean) => void;
}) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const active = state.kind === "starting" || state.kind === "recording" || state.kind === "uploading" || state.kind === "retrying";
  useEffect(() => onActiveChange?.(active), [active, onActiveChange]);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef(0);
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
    onClip(reply.clipId);
    if (reply.transcript) {
      setState({ kind: "idle" });
      onTranscript(reply.transcript);
    } else {
      const message =
        reply.transcribeError === "limited"
          ? "You've reached today's limit for story help, so we couldn't turn that into text. Your recording is saved."
          : TRANSCRIBE_FAILED;
      setState({ kind: "transcribeFailed", clipId: reply.clipId, message });
    }
  }

  async function start() {
    const mime = typeof MediaRecorder === "undefined" ? null : pickRecorderMime((t) => MediaRecorder.isTypeSupported(t));
    if (!mime || !navigator.mediaDevices?.getUserMedia) {
      onTypeInstead("This browser can't record audio, so you can type your answer instead.");
      return;
    }
    setState({ kind: "starting" });
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setState({ kind: "idle" });
      onTypeInstead("Sunset Soul can't use your microphone. You can type instead, or allow the microphone in your browser settings and try again.");
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
      onTypeInstead("This browser can't record audio, so you can type your answer instead.");
      return;
    }
    recorder.current = rec;
    rec.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    rec.onstop = () => {
      const durationMs = Date.now() - startedAt.current;
      release();
      const blob = new Blob(chunks, { type: rec.mimeType || mime });
      if (!blob.size) {
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
      onTypeInstead("This browser can't record audio, so you can type your answer instead.");
      return;
    }
    setState({ kind: "recording", elapsedMs: 0 });
    timer.current = setInterval(() => {
      const elapsedMs = Date.now() - startedAt.current;
      if (elapsedMs >= MAX_RECORDING_SECONDS * 1000) stop();
      else setState({ kind: "recording", elapsedMs });
    }, 250);
  }

  function stop() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  async function retry(clipId: string) {
    setState({ kind: "retrying", clipId });
    const result = await retryTranscriptionAction(entryId, clipId).catch(() => ({ error: TRANSCRIBE_FAILED }));
    if ("transcript" in result) {
      setState({ kind: "idle" });
      onTranscript(result.transcript);
    } else {
      setState({ kind: "transcribeFailed", clipId, message: result.error });
    }
  }

  // One status line that stays in the page, so screen readers hear each change of state once
  // (the timer itself isn't announced every second).
  const status =
    state.kind === "starting"
      ? "Starting the microphone."
      : state.kind === "recording"
        ? `Recording. Up to ${formatDuration(MAX_RECORDING_SECONDS * 1000)}.`
        : state.kind === "uploading" || state.kind === "retrying"
          ? "Recording stopped. Turning your words into text."
          : "";
  return (
    <>
      {body()}
      <p role="status" className="sr-only">
        {status}
      </p>
    </>
  );

  function body() {
    if (state.kind === "recording") {
      return (
        <div className="flex flex-col items-center gap-3 rounded-ss-lg bg-surface-raised p-5">
          <p className="flex items-center gap-2 text-label font-bold">
            <span className="h-3 w-3 animate-pulse rounded-ss-pill bg-action" aria-hidden="true" />
            Recording {formatDuration(state.elapsedMs)}
            <span className="font-normal text-ink-muted">of {formatDuration(MAX_RECORDING_SECONDS * 1000)}</span>
          </p>
          <button type="button" onClick={stop} className={buttonClass(prominent ? "action" : "secondary", "w-full")}>
            Stop recording
          </button>
        </div>
      );
    }

    if (state.kind === "uploading" || state.kind === "retrying") {
      return <p className="animate-pulse rounded-ss-lg bg-surface-raised p-5 text-center text-ink-muted">Turning your words into text…</p>;
    }

    if (state.kind === "transcribeFailed" || state.kind === "uploadFailed") {
      const uploadFailed = state.kind === "uploadFailed";
      return (
        <div role="alert" className={`${noticeClass} flex flex-col gap-3`}>
          <p>
            {uploadFailed
              ? "We couldn't save that recording. Check your connection and try again."
              : `${state.message} Your recording is saved.`}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={buttonClass("secondary")}
              onClick={() => (uploadFailed ? upload(state.blob, state.durationMs) : retry(state.clipId))}
            >
              Retry
            </button>
            <button
              type="button"
              className={buttonClass("secondary")}
              onClick={() => {
                setState({ kind: "idle" });
                onTypeInstead();
              }}
            >
              Type instead
            </button>
          </div>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={start}
        disabled={disabled || state.kind === "starting"}
        className={
          prominent
            ? "inline-flex min-h-20 w-full items-center justify-center gap-3 rounded-ss-lg bg-action px-5 py-3 text-title-3 font-bold text-on-action hover:bg-action/90 disabled:opacity-50"
            : buttonClass("secondary", "self-start")
        }
      >
        <MicIcon className={prominent ? "h-8 w-8" : "h-5 w-5"} />
        {state.kind === "starting" ? "Starting…" : label}
      </button>
    );
  }
}
