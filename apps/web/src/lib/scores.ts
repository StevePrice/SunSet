// Reading and requesting scores. Like entries.ts, every function is scoped to the signed-in user
// through the entry's owner.
import { SCORER_VERSION } from "@sunset/scoring";
import { and, count, eq, gt } from "drizzle-orm";
import { entries, entryScores } from "@/db/schema";
import type { Db } from "@/lib/db";

/** Scores per user per rolling 24 hours, to bound vision-model spend. */
export const DAILY_SCORING_LIMIT = 50;

export type ScoreStatus = "pending" | "done" | "not_sunset" | "failed" | "limited";

export type EntryScore = {
  status: ScoreStatus;
  palette: number | null;
  reach: number | null;
  setting: number | null;
  wow: number | null;
  displayScore: number | null;
  settingType: string | null;
  settingReason: string | null;
  phenomena: { kind: string; description: string }[];
  wowReason: string | null;
};

type Details = {
  scene?: {
    setting?: { type?: string; reason?: string };
    phenomena?: { kind: string; confidence: string; description: string }[];
    wow_reason?: string;
  };
};

const scoreColumns = {
  status: entryScores.status,
  palette: entryScores.palette,
  reach: entryScores.reach,
  setting: entryScores.setting,
  wow: entryScores.wow,
  displayScore: entryScores.displayScore,
  details: entryScores.details,
};

export async function getScore(db: Db, userId: string, entryId: string): Promise<EntryScore | null> {
  const [row] = await db
    .select(scoreColumns)
    .from(entryScores)
    .innerJoin(entries, eq(entries.id, entryScores.entryId))
    .where(
      and(eq(entryScores.entryId, entryId), eq(entryScores.scorerVersion, SCORER_VERSION), eq(entries.userId, userId)),
    );
  return row ? toEntryScore(row) : null;
}

/** An entry's current score with no owner check. Only for entries the owner has chosen to share. */
export async function getSharedScore(db: Db, entryId: string): Promise<EntryScore | null> {
  const [row] = await db
    .select(scoreColumns)
    .from(entryScores)
    .where(and(eq(entryScores.entryId, entryId), eq(entryScores.scorerVersion, SCORER_VERSION)));
  return row ? toEntryScore(row) : null;
}

function toEntryScore(row: {
  status: string;
  palette: number | null;
  reach: number | null;
  setting: number | null;
  wow: number | null;
  displayScore: number | null;
  details: Record<string, unknown> | null;
}): EntryScore {
  const scene = (row.details as Details | null)?.scene;
  return {
    status: row.status as ScoreStatus,
    palette: row.palette,
    reach: row.reach,
    setting: row.setting,
    wow: row.wow,
    displayScore: row.displayScore,
    settingType: scene?.setting?.type ?? null,
    settingReason: scene?.setting?.reason ?? null,
    phenomena: (scene?.phenomena ?? []).filter((p) => p.confidence === "clear"),
    wowReason: scene?.wow_reason ?? null,
  };
}

async function scoredToday(db: Db, userId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({ n: count() })
    .from(entryScores)
    .innerJoin(entries, eq(entries.id, entryScores.entryId))
    .where(and(eq(entries.userId, userId), gt(entryScores.createdAt, since)));
  return row?.n ?? 0;
}

/**
 * Records a pending score and queues the entry for the scorer, unless the user has hit the
 * daily limit. Returns the resulting status. The caller must own the entry.
 */
export async function requestScore(
  db: Db,
  queue: Queue<{ entryId: string; force?: boolean }>,
  userId: string,
  entryId: string,
  options: { force?: boolean } = {},
): Promise<ScoreStatus> {
  const limited = (await scoredToday(db, userId)) >= DAILY_SCORING_LIMIT;
  const status: ScoreStatus = limited ? "limited" : "pending";
  await db
    .insert(entryScores)
    .values({ entryId, scorerVersion: SCORER_VERSION, status })
    .onConflictDoUpdate({
      target: [entryScores.entryId, entryScores.scorerVersion],
      set: { status, error: null, createdAt: new Date() },
    });
  if (!limited) await queue.send({ entryId, ...(options.force && { force: true }) });
  return status;
}
