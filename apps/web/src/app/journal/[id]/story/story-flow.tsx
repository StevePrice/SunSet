"use client";
/* eslint-disable @next/next/no-img-element -- Journal photos are private and served by /api/photos. */

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { AiPrivacyText } from "@/components/ai-privacy";
import { noticeClass } from "@/components/styles";
import { finishStep } from "@/lib/story/interview";
import type { StoryStyle } from "@/lib/story/prompts";
import type { StoryView } from "@/lib/story/sessions";
import {
  acceptAiNoticeAction,
  answerAction,
  declineAiNoticeAction,
  draftAction,
  openersAction,
  otherQuestionAction,
  saveStoryAction,
  type DraftResult,
} from "./actions";
import { VoiceRecorder } from "./voice-recorder";

const button = "inline-flex min-h-13 min-w-12 items-center justify-center gap-2 rounded-ss-md px-5 py-2 text-center text-label font-bold disabled:opacity-50";
const primary = `${button} bg-action text-on-action hover:bg-action/90`;
const secondary = `${button} border border-border-subtle bg-transparent text-ink hover:bg-surface-raised`;
const field = "min-h-12 w-full min-w-0 rounded-ss-md border border-border-subtle bg-surface-raised px-3 py-2 text-ink placeholder:text-ink-muted";

export function StoryFlow({ entryId, initial, noticeSeen }: { entryId: string; initial: StoryView; noticeSeen: boolean }) {
  const [noticeOpen, setNoticeOpen] = useState(!noticeSeen);
  const [view, setView] = useState(initial);
  const [phase, setPhase] = useState<"interview" | "story">(initial.turns.length ? "story" : "interview");
  const [error, setError] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();

  function run(task: () => Promise<{ view: StoryView; error?: string }>) {
    setError(null);
    startBusy(async () => {
      const result = await task();
      setView(result.view);
      setError(result.error ?? null);
    });
  }

  if (noticeOpen) {
    return <FirstUseNotice entryId={entryId} onContinue={() => setNoticeOpen(false)} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <img src={`/api/photos/${entryId}/thumb`} alt="Your sunset" className="h-20 w-20 rounded-ss-md object-cover" />
        <p className="text-caption text-ink-muted">
          Your photo, recordings and words are processed by AI services (Anthropic Claude and Cloudflare Workers AI) to make
          questions, transcripts and your story. Recordings are private and never shared.
        </p>
      </div>
      {view.safetyConcern && <SupportNotice />}
      {error && <p role="alert" className="rounded-ss-md border border-border-subtle bg-surface-raised p-3 text-ink">{error}</p>}
      {phase === "interview" ? (
        <Interview entryId={entryId} view={view} busy={busy} run={run} onFinish={() => setPhase("story")} />
      ) : (
        <YourStory entryId={entryId} turns={view.turns.length} onAddMore={() => setPhase("interview")} />
      )}
    </div>
  );
}

/** Shown once, the first time a user starts AI story help (Story Capture PRD 6.9). */
function FirstUseNotice({ entryId, onContinue }: { entryId: string; onContinue: () => void }) {
  const [pending, startPending] = useTransition();
  return (
    <section className="flex flex-col gap-4 rounded-ss-lg bg-surface-raised p-5" aria-labelledby="ai-notice-title">
      <h2 id="ai-notice-title" className="text-title-3 font-bold">
        Before we start
      </h2>
      <AiPrivacyText />
      <p className="text-ink-muted">You can turn AI story help off at any time in your account settings.</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          className={primary}
          onClick={() =>
            startPending(async () => {
              await acceptAiNoticeAction();
              onContinue();
            })
          }
        >
          Continue
        </button>
        <button type="button" disabled={pending} className={secondary} onClick={() => startPending(() => declineAiNoticeAction(entryId))}>
          Turn off AI help
        </button>
      </div>
    </section>
  );
}

function SupportNotice() {
  return (
    <section role="note" className="rounded-ss-lg bg-surface-raised p-4 leading-7 text-ink">
      It sounds like you&apos;re carrying something heavy. You don&apos;t have to go through it alone. In the US, you can call or
      text <strong>988</strong> any time to reach the Suicide &amp; Crisis Lifeline. Elsewhere,{" "}
      <a href="https://findahelpline.com" className="underline" target="_blank" rel="noreferrer">
        findahelpline.com
      </a>{" "}
      lists free, confidential helplines. If you&apos;re in danger right now, call your local emergency number.
    </section>
  );
}

function Interview({
  entryId,
  view,
  busy,
  run,
  onFinish,
}: {
  entryId: string;
  view: StoryView;
  busy: boolean;
  run: (task: () => Promise<{ view: StoryView; error?: string }>) => void;
  onFinish: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [offerOneMore, setOfferOneMore] = useState(false);
  // Voice first: the mic is the main way to answer until the user chooses to type.
  const [typing, setTyping] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [clipIds, setClipIds] = useState<string[]>([]);
  const [recording, setRecording] = useState(false);
  const showBox = typing || answer.trim() !== "";
  const starting = view.turns.length === 0;
  const done = !starting && view.nextQuestion === null;

  useEffect(() => {
    if (starting && view.openers.length === 0) run(() => openersAction(entryId, false));
    // Only on first load; run is stable enough for this one call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const question = starting ? picked : view.nextQuestion;

  function send() {
    const text = answer;
    const clips = clipIds;
    setAnswer("");
    setClipIds([]);
    setOfferOneMore(false);
    run(async () => {
      const result = await answerAction(entryId, question, text, !done, clips);
      if (!result.error) setPicked(null);
      else {
        setAnswer(text);
        setClipIds(clips);
      }
      return result;
    });
  }

  const recorder = (prominent: boolean, label: string) => (
    <VoiceRecorder
      entryId={entryId}
      prominent={prominent}
      label={label}
      disabled={busy}
      onActiveChange={setRecording}
      onClip={(id) => setClipIds((ids) => [...ids, id])}
      onTranscript={(text) => {
        setVoiceNote(null);
        setAnswer((a) => (a.trim() ? `${a.trim()} ${text}` : text));
      }}
      onTypeInstead={(message) => {
        setTyping(true);
        setVoiceNote(message ?? null);
      }}
    />
  );

  // "That's my story" and "See my story". Words still in the box are saved first, so a voice answer
  // that's been transcribed but not sent with "Keep going" isn't lost.
  function finish() {
    const step = finishStep({
      pending: answer,
      answers: view.turns.map((t) => t.answer),
      hasNextQuestion: view.nextQuestion !== null,
      offeredOneMore: offerOneMore,
    });
    if (step === "offer-one-more") return setOfferOneMore(true);
    if (step === "finish") return onFinish();
    const text = answer;
    const clips = clipIds;
    run(async () => {
      const result = await answerAction(entryId, question, text, false, clips);
      if (!result.error) {
        setAnswer("");
        setClipIds([]);
        setOfferOneMore(false);
        onFinish();
      }
      return result;
    });
  }

  return (
    <section className="flex flex-col gap-4" aria-label="Interview">
      {view.turns.length > 0 && (
        <ol className="flex flex-col gap-3 text-caption">
          {view.turns.map((turn, i) => (
            <li key={i} className="flex flex-col gap-1">
              {turn.question && <span className="text-ink-muted">{turn.question}</span>}
              <span className="whitespace-pre-wrap">{turn.answer}</span>
            </li>
          ))}
        </ol>
      )}

      {starting && (
        <div className="flex flex-col gap-2">
          <p className="font-bold">Pick a question, or just start telling it.</p>
          {view.openers.length === 0 && <p className="animate-pulse text-ink-muted">Thinking of a few questions…</p>}
          {view.openers.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setPicked(picked === q ? null : q)}
              aria-pressed={picked === q}
              className={`rounded-ss-md border px-4 py-3 text-left ${picked === q ? "border-reaction-selected-border bg-reaction-selected text-on-reaction" : "border-border-subtle"}`}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {!starting && view.nextQuestion && (
        <p className="text-title-3 font-bold" aria-live="polite">
          {offerOneMore ? `One quick question before I write it up: ${view.nextQuestion}` : view.nextQuestion}
        </p>
      )}
      {done && (
        <p className="text-title-3 font-bold" aria-live="polite">
          That&apos;s a lovely memory. Want to see it written up?
        </p>
      )}
      {busy && !starting && <p className="animate-pulse text-caption text-ink-muted">Thinking…</p>}

      {voiceNote && (
        <p role="alert" className={noticeClass}>
          {voiceNote}
        </p>
      )}
      {showBox ? (
        <>
          {clipIds.length > 0 && answer.trim() && (
            <p className="text-caption text-ink-muted">Here&apos;s what I heard. Fix anything I got wrong before you carry on.</p>
          )}
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            aria-label="Your answer"
            placeholder={done ? "Anything else you'd like to add?" : "Just tell me about it, like you'd tell a friend."}
            className={`${field} min-h-28`}
          />
          {recorder(false, answer.trim() ? "Add more by voice" : "Speak instead")}
        </>
      ) : (
        <div className="flex flex-col gap-2">
          {!done && <p className="text-ink-muted">Just tell me about it, like you&apos;d tell a friend.</p>}
          {recorder(!done, done ? "Add something by voice" : "Tap to talk")}
          <button type="button" onClick={() => setTyping(true)} className="inline-flex min-h-12 items-center self-start text-label underline">
            Type instead
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        {done ? (
          <>
            <button type="button" onClick={finish} disabled={busy || recording} className={primary}>
              See my story
            </button>
            {showBox && (
              <button type="button" onClick={send} disabled={busy || recording || !answer.trim()} className={secondary}>
                Add this
              </button>
            )}
          </>
        ) : (
          <>
            {showBox && (
              <button type="button" onClick={send} disabled={busy || recording || !answer.trim()} className={primary}>
                Keep going
              </button>
            )}
            <button
              type="button"
              disabled={busy || recording}
              onClick={() => run(() => (starting ? openersAction(entryId, true) : otherQuestionAction(entryId)))}
              className={secondary}
            >
              Ask me something else
            </button>
            {!starting && (
              <button type="button" onClick={finish} disabled={busy || recording} className={secondary}>
                {offerOneMore ? "Skip, write it now" : "That's my story"}
              </button>
            )}
          </>
        )}
      </div>
      {starting && (
        <Link href={`/journal/${entryId}`} className="text-caption underline">
          Not now
        </Link>
      )}
    </section>
  );
}

type Kind = "my" | "crafted";
type Length = "line" | "short" | "full";
const LENGTHS: { key: Length; label: string }[] = [
  { key: "line", label: "One line" },
  { key: "short", label: "Short" },
  { key: "full", label: "Fuller" },
];

function YourStory({ entryId, turns, onAddMore }: { entryId: string; turns: number; onAddMore: () => void }) {
  const [kind, setKind] = useState<Kind>("my");
  const [length, setLength] = useState<Length>("short");
  const [photoDetails, setPhotoDetails] = useState(true);
  const style: StoryStyle = kind === "my" ? `my-${length}` : photoDetails ? "crafted-photo" : "crafted-plain";
  // Each version as last shown or edited, so switching back and forth keeps edits.
  const [texts, setTexts] = useState<Partial<Record<StoryStyle, string>>>({});
  const [loaded, setLoaded] = useState<Partial<Record<StoryStyle, DraftResult>>>({});
  const [title, setTitle] = useState<string | null>(null);
  const [caption, setCaption] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();

  function load(target: StoryStyle, rewrite = false) {
    startLoading(async () => {
      setError(null);
      const draft = await draftAction(entryId, target, rewrite);
      setLoaded((l) => ({ ...l, [target]: draft }));
      setTexts((t) => ({ ...t, [target]: draft.text }));
      setTitle((v) => v ?? draft.title);
      setCaption((v) => v ?? draft.caption);
      setError(draft.error ?? null);
    });
  }

  useEffect(() => {
    if (loaded[style] === undefined) load(style);
    // Load each version the first time it's shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style]);

  const draft = loaded[style];
  const text = texts[style] ?? "";
  const tab = (active: boolean) =>
    `rounded-ss-pill px-4 py-1.5 text-caption ${active ? "bg-action text-on-action" : "border border-border-subtle"}`;

  return (
    <form
      className="flex flex-col gap-4"
      action={(form) =>
        startSaving(async () => {
          const result = await saveStoryAction(entryId, style, form);
          if (result?.error) setError(result.error);
        })
      }
    >
      <h2 className="text-title-2 font-semibold">Your story</h2>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Story style">
        <button type="button" className={tab(kind === "my")} aria-pressed={kind === "my"} onClick={() => setKind("my")}>
          My story
        </button>
        <button type="button" className={tab(kind === "crafted")} aria-pressed={kind === "crafted"} onClick={() => setKind("crafted")}>
          Crafted story
        </button>
      </div>
      {kind === "my" ? (
        <div className="flex gap-2" role="group" aria-label="Length">
          {LENGTHS.map((l) => (
            <button key={l.key} type="button" className={tab(length === l.key)} aria-pressed={length === l.key} onClick={() => setLength(l.key)}>
              {l.label}
            </button>
          ))}
        </div>
      ) : (
        <label className="flex items-center gap-2 text-caption">
          <input type="checkbox" checked={photoDetails} onChange={(e) => setPhotoDetails(e.target.checked)} /> Add details from my photo
        </label>
      )}

      {draft?.stale && (
        <p className="rounded-ss-md border border-border-subtle bg-surface-raised p-3 text-ink">
          You&apos;ve added more since you edited this version.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => confirm("Rewrite this version with everything you've shared? Your edits to it will be replaced.") && load(style, true)}
          >
            Rewrite it
          </button>
        </p>
      )}
      {loading && !draft ? (
        <p className="min-h-40 animate-pulse rounded-ss-md bg-surface-raised p-4 text-ink-muted">Writing your story…</p>
      ) : (
        <textarea
          name="story"
          aria-label="Story"
          value={text}
          onChange={(e) => setTexts((t) => ({ ...t, [style]: e.target.value }))}
          className={`${field} min-h-40 ss-story`}
        />
      )}
      <label className="flex flex-col gap-1 text-caption">
        Title
        <input name="title" value={title ?? ""} onChange={(e) => setTitle(e.target.value)} maxLength={80} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-caption">
        Caption for sharing
        <input name="caption" value={caption ?? ""} onChange={(e) => setCaption(e.target.value)} maxLength={200} className={field} />
      </label>
      {error && <p role="alert" className="rounded-ss-md border border-border-subtle bg-surface-raised p-3 text-ink">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={saving || loading || !text.trim()} className={primary}>
          {saving ? "Saving…" : "Save to my Journal"}
        </button>
        <button type="button" onClick={onAddMore} disabled={saving} className={secondary}>
          Add more to my story
        </button>
      </div>
      <p className="text-caption text-ink-muted">Written from {turns === 1 ? "your answer" : `your ${turns} answers`}. Edit anything you like.</p>
    </form>
  );
}
