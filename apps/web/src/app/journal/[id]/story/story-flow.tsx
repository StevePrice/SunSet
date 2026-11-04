"use client";
/* eslint-disable @next/next/no-img-element -- Journal photos are private and served by /api/photos. */

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import type { StoryStyle } from "@/lib/story/prompts";
import type { StoryView } from "@/lib/story/sessions";
import { answerAction, draftAction, openersAction, otherQuestionAction, saveStoryAction, type DraftResult } from "./actions";

const SHORT_ANSWER_WORDS = 15;
const button = "rounded-lg px-4 py-2 font-medium disabled:opacity-50";
const primary = `${button} bg-orange-600 text-white hover:bg-orange-700`;
const secondary = `${button} border border-zinc-300 dark:border-zinc-700`;
const field = "rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

export function StoryFlow({ entryId, initial }: { entryId: string; initial: StoryView }) {
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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <img src={`/api/photos/${entryId}/thumb`} alt="Your sunset" className="h-20 w-20 rounded-xl object-cover" />
        <p className="text-xs text-zinc-500">
          Your photo and words are sent to Claude, Anthropic&apos;s AI, to write questions and your story. Anthropic doesn&apos;t
          train its models on them. Your story stays private unless you share it.
        </p>
      </div>
      {view.safetyConcern && <SupportNotice />}
      {error && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
      {phase === "interview" ? (
        <Interview entryId={entryId} view={view} busy={busy} run={run} onFinish={() => setPhase("story")} />
      ) : (
        <YourStory entryId={entryId} turns={view.turns.length} onAddMore={() => setPhase("interview")} />
      )}
    </div>
  );
}

function SupportNotice() {
  return (
    <section role="note" className="rounded-2xl bg-sky-50 p-4 text-sm leading-6 text-sky-950">
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
    setAnswer("");
    setOfferOneMore(false);
    run(async () => {
      const result = await answerAction(entryId, question, text, !done);
      if (!result.error) setPicked(null);
      else setAnswer(text);
      return result;
    });
  }

  function finish() {
    const only = view.turns[0];
    const short = view.turns.length === 1 && only.answer.split(/\s+/).length < SHORT_ANSWER_WORDS;
    if (short && view.nextQuestion && !offerOneMore) setOfferOneMore(true);
    else onFinish();
  }

  return (
    <section className="flex flex-col gap-4" aria-label="Interview">
      {view.turns.length > 0 && (
        <ol className="flex flex-col gap-3 text-sm">
          {view.turns.map((turn, i) => (
            <li key={i} className="flex flex-col gap-1">
              {turn.question && <span className="text-zinc-500">{turn.question}</span>}
              <span className="whitespace-pre-wrap">{turn.answer}</span>
            </li>
          ))}
        </ol>
      )}

      {starting && (
        <div className="flex flex-col gap-2">
          <p className="font-medium">Pick a question, or just start telling it.</p>
          {view.openers.length === 0 && <p className="animate-pulse text-zinc-500">Thinking of a few questions…</p>}
          {view.openers.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setPicked(picked === q ? null : q)}
              aria-pressed={picked === q}
              className={`rounded-xl border px-4 py-3 text-left ${picked === q ? "border-orange-600 bg-orange-50 dark:bg-orange-950" : "border-zinc-300 dark:border-zinc-700"}`}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {!starting && view.nextQuestion && (
        <p className="text-xl font-medium" aria-live="polite">
          {offerOneMore ? `One quick question before I write it up: ${view.nextQuestion}` : view.nextQuestion}
        </p>
      )}
      {done && (
        <p className="text-xl font-medium" aria-live="polite">
          That&apos;s a lovely memory. Want to see it written up?
        </p>
      )}
      {busy && !starting && <p className="animate-pulse text-sm text-zinc-500">Thinking…</p>}

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        aria-label="Your answer"
        placeholder={done ? "Anything else you'd like to add?" : "Just tell me about it, like you'd tell a friend."}
        className={`${field} min-h-28`}
      />
      <div className="flex flex-wrap gap-3">
        {done ? (
          <>
            <button type="button" onClick={onFinish} disabled={busy} className={primary}>
              See my story
            </button>
            <button type="button" onClick={send} disabled={busy || !answer.trim()} className={secondary}>
              Add this
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={send} disabled={busy || !answer.trim()} className={primary}>
              Keep going
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => (starting ? openersAction(entryId, true) : otherQuestionAction(entryId)))}
              className={secondary}
            >
              Ask me something else
            </button>
            {!starting && (
              <button type="button" onClick={finish} disabled={busy} className={secondary}>
                {offerOneMore ? "Skip, write it now" : "That's my story"}
              </button>
            )}
          </>
        )}
      </div>
      {starting && (
        <Link href={`/journal/${entryId}`} className="text-sm underline">
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
    `rounded-full px-4 py-1.5 text-sm ${active ? "bg-orange-600 text-white" : "border border-zinc-300 dark:border-zinc-700"}`;

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
      <h2 className="text-2xl font-semibold">Your story</h2>
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
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={photoDetails} onChange={(e) => setPhotoDetails(e.target.checked)} /> Add details from my photo
        </label>
      )}

      {draft?.stale && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
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
        <p className="min-h-40 animate-pulse rounded-lg bg-zinc-100 p-4 text-zinc-500 dark:bg-zinc-900">Writing your story…</p>
      ) : (
        <textarea
          name="story"
          aria-label="Story"
          value={text}
          onChange={(e) => setTexts((t) => ({ ...t, [style]: e.target.value }))}
          className={`${field} min-h-40 text-lg leading-8`}
        />
      )}
      <label className="flex flex-col gap-1 text-sm">
        Title
        <input name="title" value={title ?? ""} onChange={(e) => setTitle(e.target.value)} maxLength={80} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Caption for sharing
        <input name="caption" value={caption ?? ""} onChange={(e) => setCaption(e.target.value)} maxLength={200} className={field} />
      </label>
      {error && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={saving || loading || !text.trim()} className={primary}>
          {saving ? "Saving…" : "Save to my Journal"}
        </button>
        <button type="button" onClick={onAddMore} disabled={saving} className={secondary}>
          Add more to my story
        </button>
      </div>
      <p className="text-xs text-zinc-500">Written from {turns === 1 ? "your answer" : `your ${turns} answers`}. Edit anything you like.</p>
    </form>
  );
}
