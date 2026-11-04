/* eslint-disable @next/next/no-img-element -- reference photos are served by /api/admin/calibration. */
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { CALIBRATION_PARAMS, isParam, PARAM_INFO, results } from "@/lib/calibration";
import { withDrizzle } from "@/lib/db";

function describe(agreement: number | null): string {
  if (agreement === null) return "Not enough votes yet.";
  if (agreement >= 0.7) return "The scorer mostly ranks these photos the way you do.";
  if (agreement >= 0.4) return "The scorer partly agrees with you; the biggest disagreements are worth a look.";
  return "The scorer disagrees with you a lot on this one; it needs tuning.";
}

export default async function CalibrationResultsPage(props: PageProps<"/admin/calibrate/results">) {
  const admin = await requireAdmin();
  const { param: raw, mine } = await props.searchParams;
  const param = isParam(raw) ? raw : "wow";
  const onlyMine = mine === "1";
  const data = await withDrizzle((db) => results(db, param, onlyMine ? admin.id : undefined));
  const gap = (p: (typeof data.photos)[number]) => (p.modelScore == null ? 0 : p.modelScore - p.humanScore);

  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {CALIBRATION_PARAMS.map((p) => (
          <Link
            key={p}
            href={`/admin/calibrate/results?param=${p}${onlyMine ? "&mine=1" : ""}`}
            className={`rounded-full px-4 py-1.5 text-sm ${p === param ? "bg-orange-600 text-white" : "border border-zinc-300 dark:border-zinc-700"}`}
          >
            {PARAM_INFO[p].label}
          </Link>
        ))}
        <Link href={`/admin/calibrate/results?param=${param}${onlyMine ? "" : "&mine=1"}`} className="ml-auto text-sm underline">
          {onlyMine ? "Show everyone's votes" : "Show only my votes"}
        </Link>
      </div>
      <header>
        <h1 className="text-2xl font-semibold">{PARAM_INFO[param].label}: you vs. the scorer</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {data.votes} votes from {data.raters} {data.raters === 1 ? "person" : "people"}
          {data.scorerVersion && ` · scorer ${data.scorerVersion}`}
          {data.agreement !== null && ` · agreement ${data.agreement.toFixed(2)} (1 = same order)`}. {describe(data.agreement)}
        </p>
        <p className="text-xs text-zinc-500">
          &ldquo;Yours&rdquo; turns your ranking into 1–10 (top photo 10, bottom 1), so compare the order more than the exact numbers.
        </p>
      </header>
      <ol className="flex flex-col gap-2">
        {data.photos.map((p, i) => (
          <li key={p.id} className="flex items-center gap-3 border-t border-zinc-200 pt-2 dark:border-zinc-800">
            <span className="w-6 text-right text-sm text-zinc-500 tabular-nums">{i + 1}</span>
            <img src={`/api/admin/calibration/${p.id}`} alt="" className="h-14 w-20 rounded-lg object-cover" loading="lazy" />
            <div className="flex min-w-0 flex-1 flex-col text-sm">
              <span className="truncate">{p.title}</span>
              {param === "wow" && p.wowReason && <span className="truncate text-xs text-zinc-500">Scorer: {p.wowReason}</span>}
            </div>
            <span className="text-sm tabular-nums">Yours {p.humanScore}</span>
            <span className="text-sm tabular-nums">Scorer {p.modelScore ?? "–"}</span>
            <span
              className={`w-10 text-right text-sm tabular-nums ${Math.abs(gap(p)) >= 3 ? "font-semibold text-red-700" : "text-zinc-500"}`}
            >
              {gap(p) > 0 ? `+${gap(p)}` : gap(p)}
            </span>
          </li>
        ))}
      </ol>
      {data.photos.length === 0 && <p className="text-zinc-500">No votes yet. <Link href={`/admin/calibrate?param=${param}`} className="underline">Start rating</Link>.</p>}
    </main>
  );
}
