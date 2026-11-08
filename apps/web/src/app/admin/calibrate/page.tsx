import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { CALIBRATION_PARAMS, isParam, nextPair, PARAM_INFO } from "@/lib/calibration";
import { withDrizzle } from "@/lib/db";
import { RatePairs } from "./rate-pairs";

export default async function CalibratePage(props: PageProps<"/admin/calibrate">) {
  const admin = await requireAdmin();
  const { param: raw } = await props.searchParams;
  const param = isParam(raw) ? raw : "wow";
  const pair = await withDrizzle((db) => nextPair(db, admin.id, param));

  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Parameter">
        {CALIBRATION_PARAMS.map((p) => (
          <Link
            key={p}
            href={`/admin/calibrate?param=${p}`}
            aria-current={p === param ? "page" : undefined}
            className={`rounded-ss-pill px-4 py-1.5 text-caption ${p === param ? "bg-action text-on-action" : "border border-border-subtle"}`}
          >
            {PARAM_INFO[p].label}
          </Link>
        ))}
      </div>
      <RatePairs key={param} param={param} info={PARAM_INFO[param]} initial={pair} />
    </main>
  );
}
