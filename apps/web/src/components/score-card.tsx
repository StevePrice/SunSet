"use client";

import { useEffect, useState } from "react";
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

export function ScoreCard({ entryId, initial }: { entryId: string; initial: ScoreState }) {
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

  const box = "rounded-ss-lg bg-surface-raised p-5";
  const retry = (label: string) => (
    <button type="button" disabled={requesting} onClick={rescore} className="mt-2 text-caption underline disabled:opacity-50">
      {label}
    </button>
  );

  if (score.status === "pending" && !timedOut) {
    return (
      <section className={`${box} animate-pulse`} aria-live="polite">
        Scoring your sunset…
      </section>
    );
  }
  if (score.status === "pending" || score.status === "failed" || score.status === "none") {
    return (
      <section className={box}>
        <p>{score.status === "none" ? "This sunset hasn't been scored yet." : "We couldn't score this one."}</p>
        {retry(score.status === "none" ? "Score it" : "Try again")}
      </section>
    );
  }
  if (score.status === "limited") {
    return (
      <section className={box}>
        <p>You&apos;ve reached today&apos;s scoring limit. Try again tomorrow.</p>
        {retry("Try again")}
      </section>
    );
  }
  if (score.status === "not_sunset") {
    return <section className={box}>This doesn&apos;t look like a sunset, so it wasn&apos;t scored.</section>;
  }

  return <ScoreBreakdown score={score} />;
}

/** A finished score: the overall number, the four parts, and what the AI saw. */
export function ScoreBreakdown({ score, whose = "your" }: { score: EntryScore; whose?: string }) {
  return (
    <section className="flex flex-col gap-4 rounded-ss-lg bg-surface-raised p-5" aria-label="Sunset score">
      {score.displayScore != null && (
        <div className="flex">
          <ScoreBadge score={score.displayScore} size="lg" />
        </div>
      )}
      <dl className="flex flex-col gap-2">
        {(Object.keys(LABELS) as (keyof typeof LABELS)[]).map((key) => (
          <div key={key} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-3">
            <dt className="text-caption">{LABELS[key]}</dt>
            <dd className="h-2 overflow-hidden rounded-ss-pill bg-divider">
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
        Palette and Reach are measured from {whose} photo&apos;s colours; Setting and Wow Factor are judged by AI.
      </p>
    </section>
  );
}
