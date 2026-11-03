"use client";

import { useEffect, useState } from "react";
import type { EntryScore, ScoreStatus } from "@/lib/scores";

type ScoreState = EntryScore | { status: "none" };

const LABELS = { palette: "Palette", reach: "Reach", setting: "Setting", wow: "Wow Factor" } as const;
const PHENOMENA: Record<string, string> = {
  sun_rays: "Sun rays",
  reflection: "Reflection",
  halo: "Halo",
  green_flash: "Green flash",
  iridescent_clouds: "Iridescent clouds",
  other_rare: "Something rare",
};
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

  const box = "rounded-2xl bg-zinc-100 p-5 dark:bg-zinc-900";
  const retry = (label: string) => (
    <button type="button" disabled={requesting} onClick={rescore} className="mt-2 text-sm underline disabled:opacity-50">
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
    <section className="flex flex-col gap-4 rounded-2xl bg-zinc-100 p-5 dark:bg-zinc-900" aria-label="Sunset score">
      <div className="flex items-baseline gap-2">
        <span className="text-5xl font-semibold text-orange-600">{score.displayScore}</span>
        <span className="text-zinc-500">/ 100</span>
      </div>
      <dl className="flex flex-col gap-2">
        {(Object.keys(LABELS) as (keyof typeof LABELS)[]).map((key) => (
          <div key={key} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-3">
            <dt className="text-sm">{LABELS[key]}</dt>
            <dd className="h-2 overflow-hidden rounded-full bg-zinc-300 dark:bg-zinc-700">
              <div className="h-full rounded-full bg-orange-500" style={{ width: `${(score[key] ?? 0) * 10}%` }} />
            </dd>
            <dd className="text-right text-sm tabular-nums">{score[key]}</dd>
          </div>
        ))}
      </dl>
      {score.settingType && (
        <p className="text-sm">
          <strong>{SETTINGS[score.settingType] ?? score.settingType}.</strong> {score.settingReason}
        </p>
      )}
      {score.phenomena.length > 0 && (
        <p className="text-sm">
          <strong>{score.phenomena.map((p) => PHENOMENA[p.kind] ?? p.kind).join(" · ")}.</strong> {score.wowReason}
        </p>
      )}
      <p className="text-xs text-zinc-500">
        Palette and Reach are measured from {whose} photo&apos;s colours; Setting and Wow Factor are judged by AI.
      </p>
    </section>
  );
}
