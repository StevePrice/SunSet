"use client";
/* eslint-disable @next/next/no-img-element -- reference photos are served by /api/admin/calibration. */

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import type { CalibrationParam, Choice, Pair } from "@/lib/calibration";
import { voteAction } from "../actions";

// Tap the photo with more of the parameter, or "About the same". Keys: ← → and ↓ (or space).
export function RatePairs({
  param,
  info,
  initial,
}: {
  param: CalibrationParam;
  info: { label: string; question: string; hint: string };
  initial: Pair | null;
}) {
  const [pair, setPair] = useState(initial);
  const [count, setCount] = useState(0);
  const [pending, start] = useTransition();

  const vote = useCallback(
    (choice: Choice) => {
      if (!pair || pending) return;
      start(async () => {
        setPair(await voteAction(param, pair.left.id, pair.right.id, choice));
        setCount((c) => c + 1);
      });
    },
    [pair, pending, param],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") vote("left");
      else if (e.key === "ArrowRight") vote("right");
      else if (e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        vote("same");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [vote]);

  if (!pair) {
    return (
      <p className="rounded-2xl bg-zinc-100 p-6 dark:bg-zinc-900">
        You&apos;ve compared every pair for {info.label}.{" "}
        <Link href={`/admin/calibrate/results?param=${param}`} className="underline">
          See the results
        </Link>
        .
      </p>
    );
  }

  const photo = (side: "left" | "right") => {
    const p = pair[side];
    return (
      <button
        type="button"
        onClick={() => vote(side)}
        disabled={pending}
        className="group flex flex-col gap-1 text-left disabled:opacity-60"
        aria-label={`${side === "left" ? "Left" : "Right"}: ${p.title}`}
      >
        <img
          src={`/api/admin/calibration/${p.id}`}
          alt=""
          className="aspect-[4/3] w-full rounded-xl bg-zinc-200 object-cover ring-orange-600 group-hover:ring-4 dark:bg-zinc-800"
        />
        <span className="text-xs text-zinc-500">{p.credit}</span>
      </button>
    );
  };

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{info.question}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{info.hint}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {photo("left")}
        {photo("right")}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => vote("same")}
          disabled={pending}
          className="rounded-lg border border-zinc-300 px-4 py-2 disabled:opacity-50 dark:border-zinc-700"
        >
          About the same
        </button>
        <span className="text-sm text-zinc-500">
          {pair.done + (pending ? 1 : 0)} of {pair.total} pairs done{count ? ` · ${count} this visit` : ""}. About 40 per
          parameter is enough for a first ranking. Keys: ← → ↓
        </span>
      </div>
    </section>
  );
}
