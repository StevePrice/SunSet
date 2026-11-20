"use client";

// The score on Entry Detail (Phase 4e, Build Spec 3.6): the photo and story lead and the score is
// a quiet detail. Two pieces share one score state, so they poll and rescore together:
// - WowLine, under the title and date: the scorer's one-line reason ("Scoring…" while it runs);
// - ScoreDetails, near the bottom: a row closed by default with the badge, opening to the parts.
// This is the only place a person sees their score: never on photos, the Share Page or share images.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ScoreBadge } from "@/components/score-badge";
import type { EntryScore, ScoreStatus } from "@/lib/scores";

type ScoreState = EntryScore | { status: "none" };

const LABELS = { palette: "Palette", reach: "Reach", setting: "Setting", wow: "Wow Factor" } as const;
const SETTINGS: Record<string, string> = {
  mountains: "Mountains",
  ocean: "Ocean",
  lake_or_river: "Lake or river",
  skyline: "Skyline",
  trees: "Trees",
  open_horizon: "Open horizon",
  other: "Other",
};
const WAITING: (ScoreStatus | "none")[] = ["pending"];
const POLL_MS = 1500;
const GIVE_UP_MS = 90_000;

type ScoreContextValue = { score: ScoreState; scoring: boolean; requesting: boolean; rescore: () => void };
const ScoreContext = createContext<ScoreContextValue | null>(null);

function useScore(): ScoreContextValue {
  const value = useContext(ScoreContext);
  if (!value) throw new Error("WowLine and ScoreDetails must sit inside a ScoreProvider.");
  return value;
}

export function ScoreProvider({ entryId, initial, children }: { entryId: string; initial: ScoreState; children: ReactNode }) {
  const [score, setScore] = useState<ScoreState>(initial);
  const [timedOut, setTimedOut] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!WAITING.includes(score.status)) return;
    const started = Date.now();
    const timer = setInterval(async () => {
      if (Date.now() - started > GIVE_UP_MS) {
        clearInterval(timer);
        setTimedOut(true);
        return;
      }
      const response = await fetch(`/api/entries/${entryId}/score`, { cache: "no-store" }).catch(() => null);
      if (response?.ok) setScore((await response.json()) as ScoreState);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [entryId, score.status]);

  async function rescore() {
    setRequesting(true);
    setTimedOut(false);
    const response = await fetch(`/api/entries/${entryId}/score`, { method: "POST" }).catch(() => null);
    const status = response?.ok ? ((await response.json()) as { status: ScoreStatus }).status : "failed";
    setScore({ ...(score as EntryScore), status });
    setRequesting(false);
  }

  const scoring = score.status === "pending" && !timedOut;
  return <ScoreContext.Provider value={{ score, scoring, requesting, rescore }}>{children}</ScoreContext.Provider>;
}

/** The scorer's one-line reason, under the title and date. Nothing when there's no reason to show. */
export function WowLine() {
  const { score, scoring } = useScore();
  if (scoring) {
    return (
      <p className="animate-pulse text-caption text-ink-muted" aria-live="polite">
        Scoring…
      </p>
    );
  }
  if (score.status !== "done" || !score.wowReason) return null;
  return <p className="text-caption text-ink-muted">{score.wowReason}</p>;
}

/** "Score details": closed by default, with the badge (or "Scoring…") on the row. Owner only. */
export function ScoreDetails() {
  const { score, scoring, requesting, rescore } = useScore();
  const done = score.status === "done" && score.displayScore != null ? score : null;

  const retry = (label: string) => (
    <button type="button" disabled={requesting} onClick={rescore} className="mt-2 text-caption underline disabled:opacity-50">
      {label}
    </button>
  );

  let body: ReactNode;
  if (scoring) body = <p>Scoring your sunset…</p>;
  else if (done) body = <ScoreBreakdown score={done} />;
  else if (score.status === "limited")
    body = (
      <>
        <p>You&apos;ve reached today&apos;s scoring limit. Try again tomorrow.</p>
        {retry("Try again")}
      </>
    );
  else if (score.status === "not_sunset") body = <p>This doesn&apos;t look like a sunset, so it wasn&apos;t scored.</p>;
  else
    body = (
      <>
        <p>{score.status === "none" ? "This sunset hasn't been scored yet." : "We couldn't score this one."}</p>
        {retry(score.status === "none" ? "Score it" : "Try again")}
      </>
    );

  return (
    <details className="group rounded-ss-lg bg-surface-raised">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 [&::-webkit-details-marker]:hidden">
        <span className="text-label font-bold">Score details</span>
        <span className="flex items-center gap-3">
          {scoring ? (
            <span className="animate-pulse text-caption text-ink-muted">Scoring…</span>
          ) : (
            done && <ScoreBadge score={done.displayScore!} size="sm" />
          )}
          <span aria-hidden className="text-ink-muted transition-transform group-open:rotate-90">
            ›
          </span>
        </span>
      </summary>
      <div className="px-5 pb-5" aria-live="polite">
        {body}
      </div>
    </details>
  );
}

/**
 * A finished score: the four parts and what the AI saw. On Entry Detail it opens with
 * "78 out of 100…" (the badge is on the row above); admins see it with the badge, about someone
 * else's photo.
 */
export function ScoreBreakdown({ score, forAdmin = false }: { score: EntryScore; forAdmin?: boolean }) {
  return (
    <section className="flex flex-col gap-4" aria-label="Sunset score">
      {forAdmin
        ? score.displayScore != null && (
            <div className="flex">
              <ScoreBadge score={score.displayScore} size="lg" />
            </div>
          )
        : score.displayScore != null && (
            <p>{score.displayScore} out of 100, the average of four parts. Only you see this.</p>
          )}
      <dl className="flex flex-col gap-2">
        {(Object.keys(LABELS) as (keyof typeof LABELS)[]).map((key) => (
          <div key={key} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-3">
            <dt className="text-caption">{LABELS[key]}</dt>
            <dd className="h-2 overflow-hidden rounded-ss-pill bg-surface">
              <div className="h-full rounded-ss-pill bg-score" style={{ width: `${(score[key] ?? 0) * 10}%` }} />
            </dd>
            <dd className="text-right text-caption tabular-nums">{score[key]}</dd>
          </div>
        ))}
      </dl>
      {score.settingType && (
        <p className="text-caption">
          <strong>{SETTINGS[score.settingType] ?? score.settingType}.</strong> {score.settingReason}
        </p>
      )}
      {score.wowReason && (
        <p className="text-caption">
          <strong>Wow:</strong> {score.wowReason}
        </p>
      )}
      <p className="text-caption text-ink-muted">
        Palette and Reach are measured from {forAdmin ? "the" : "your"} photo&apos;s colors. Setting and Wow Factor are judged by AI.
      </p>
    </section>
  );
}
