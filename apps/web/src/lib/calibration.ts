// Side-by-side calibration: founders pick which of two reference photos has more of a parameter,
// and the votes become a ranking to compare with the scorer's. Comparing two photos is easier and
// more consistent than giving each one a number.
import { and, eq } from "drizzle-orm";
import { calibrationPhotos, calibrationVotes, type CalibrationModelScore } from "@/db/schema";
import type { Db } from "@/lib/db";

export const CALIBRATION_PARAMS = ["wow", "reach", "palette", "setting"] as const;
export type CalibrationParam = (typeof CALIBRATION_PARAMS)[number];

export const PARAM_INFO: Record<CalibrationParam, { label: string; question: string; hint: string }> = {
  wow: {
    label: "Wow Factor",
    question: "Which one makes you say “wow”?",
    hint: "Your gut reaction to the whole photo, from “Nice.” to “Is that real?”. Not colour alone, and never photo quality.",
  },
  reach: {
    label: "Reach",
    question: "Which has sunset colour across more of the frame?",
    hint: "How much of the picture is lit by the sunset, not how beautiful it is.",
  },
  palette: {
    label: "Palette",
    question: "Which has richer, more varied colour?",
    hint: "More distinct colours, and more vivid ones.",
  },
  setting: {
    label: "Setting",
    question: "Which has the better setting?",
    hint: "What the sky is paired with: mountains, water, a skyline, trees, or nothing much.",
  },
};

export type Choice = "left" | "right" | "same";
export type PhotoInfo = { id: string; title: string; credit: string | null; sourceUrl: string | null };
export type Pair = { left: PhotoInfo; right: PhotoInfo; done: number; total: number };

export function isParam(value: unknown): value is CalibrationParam {
  return CALIBRATION_PARAMS.includes(value as CalibrationParam);
}

const photoColumns = {
  id: calibrationPhotos.id,
  title: calibrationPhotos.title,
  credit: calibrationPhotos.credit,
  sourceUrl: calibrationPhotos.sourceUrl,
};

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/**
 * The next pair for this rater: a photo they've compared least, against one it hasn't met yet,
 * preferring photos with few comparisons, so every photo gets compared evenly. Null when every
 * pair is done.
 */
export async function nextPair(db: Db, raterId: string, param: CalibrationParam, random = Math.random): Promise<Pair | null> {
  const photos = await db.select(photoColumns).from(calibrationPhotos).where(eq(calibrationPhotos.isSunset, true));
  const votes = await db
    .select({ leftId: calibrationVotes.leftId, rightId: calibrationVotes.rightId })
    .from(calibrationVotes)
    .where(and(eq(calibrationVotes.raterId, raterId), eq(calibrationVotes.param, param)));
  const seen = new Set(votes.map((v) => pairKey(v.leftId, v.rightId)));
  const counts = new Map(photos.map((p) => [p.id, 0]));
  for (const v of votes) {
    counts.set(v.leftId, (counts.get(v.leftId) ?? 0) + 1);
    counts.set(v.rightId, (counts.get(v.rightId) ?? 0) + 1);
  }
  const total = (photos.length * (photos.length - 1)) / 2;
  // Shuffle first so ties are broken randomly, then sort by fewest comparisons.
  const order = photos
    .map((p) => ({ p, r: random() }))
    .sort((a, b) => (counts.get(a.p.id)! - counts.get(b.p.id)!) || a.r - b.r)
    .map((x) => x.p);
  for (const a of order) {
    const b = order.find((o) => o.id !== a.id && !seen.has(pairKey(a.id, o.id)));
    if (b) return random() < 0.5 ? { left: a, right: b, done: seen.size, total } : { left: b, right: a, done: seen.size, total };
  }
  return null;
}

export async function recordVote(db: Db, raterId: string, param: CalibrationParam, leftId: string, rightId: string, choice: Choice) {
  await db.insert(calibrationVotes).values({ id: crypto.randomUUID(), raterId, param, leftId, rightId, choice });
}

export type RankedPhoto = PhotoInfo & {
  comparisons: number;
  winRate: number;
  /** The founders' ranking turned into a 1–10 score: the top photo 10, the bottom 1. */
  humanScore: number;
  modelScore: number | null;
  wowReason: string | null;
};

export type Results = {
  photos: RankedPhoto[];
  votes: number;
  raters: number;
  /** Spearman rank correlation between the founders' ranking and the scorer: 1 = same order. */
  agreement: number | null;
  scorerVersion: string | null;
};

/** Average ranks, with ties sharing the mean rank. */
function ranks(values: number[]): number[] {
  const order = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const out = new Array<number>(values.length);
  for (let i = 0; i < order.length; ) {
    let j = i;
    while (j + 1 < order.length && order[j + 1].v === order[i].v) j++;
    for (let k = i; k <= j; k++) out[order[k].i] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return out;
}

export function spearman(xs: number[], ys: number[]): number | null {
  if (xs.length < 3) return null;
  const rx = ranks(xs);
  const ry = ranks(ys);
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const mx = mean(rx);
  const my = mean(ry);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < rx.length; i++) {
    num += (rx[i] - mx) * (ry[i] - my);
    dx += (rx[i] - mx) ** 2;
    dy += (ry[i] - my) ** 2;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : null;
}

export async function results(db: Db, param: CalibrationParam, raterId?: string): Promise<Results> {
  const photos = await db
    .select({ ...photoColumns, model: calibrationPhotos.model })
    .from(calibrationPhotos)
    .where(eq(calibrationPhotos.isSunset, true));
  const votes = await db
    .select({ raterId: calibrationVotes.raterId, leftId: calibrationVotes.leftId, rightId: calibrationVotes.rightId, choice: calibrationVotes.choice })
    .from(calibrationVotes)
    .where(raterId ? and(eq(calibrationVotes.param, param), eq(calibrationVotes.raterId, raterId)) : eq(calibrationVotes.param, param));

  const wins = new Map<string, number>();
  const games = new Map<string, number>();
  for (const v of votes) {
    const [l, r] = v.choice === "left" ? [1, 0] : v.choice === "right" ? [0, 1] : [0.5, 0.5];
    wins.set(v.leftId, (wins.get(v.leftId) ?? 0) + l);
    wins.set(v.rightId, (wins.get(v.rightId) ?? 0) + r);
    games.set(v.leftId, (games.get(v.leftId) ?? 0) + 1);
    games.set(v.rightId, (games.get(v.rightId) ?? 0) + 1);
  }

  const rated = photos.filter((p) => games.get(p.id));
  const rates = rated.map((p) => wins.get(p.id)! / games.get(p.id)!);
  const r = ranks(rates);
  const ranked: RankedPhoto[] = rated.map((p, i) => {
    const model = p.model as CalibrationModelScore | null;
    return {
      id: p.id,
      title: p.title,
      credit: p.credit,
      sourceUrl: p.sourceUrl,
      comparisons: games.get(p.id)!,
      winRate: rates[i],
      humanScore: rated.length > 1 ? Math.round(1 + (9 * (r[i] - 1)) / (rated.length - 1)) : 5,
      modelScore: model?.[param] ?? null,
      wowReason: model?.wowReason ?? null,
    };
  });
  ranked.sort((a, b) => b.winRate - a.winRate);
  const both = ranked.filter((p) => p.modelScore != null);
  const scorerVersion = (photos.find((p) => p.model)?.model as CalibrationModelScore | null)?.scorerVersion ?? null;
  return {
    photos: ranked,
    votes: votes.length,
    raters: new Set(votes.map((v) => v.raterId)).size,
    agreement: spearman(both.map((p) => p.winRate), both.map((p) => p.modelScore!)),
    scorerVersion,
  };
}
