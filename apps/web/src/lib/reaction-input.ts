// What a friend's browser may send to /s/[id]/reactions, and the rules for it (PRD 6.9).
// Kept free of database code so the client and the tests can import it.
import { z } from "zod";

export const REACTION_KINDS = ["wow", "wish", "love"] as const;
export type ReactionKind = (typeof REACTION_KINDS)[number];

/** Positive only (PRD 6.9). In the order the Share Page shows them. */
export const REACTION_LABELS: Record<ReactionKind, string> = {
  wow: "Wow",
  wish: "Wish I was there",
  love: "Love this!",
};

export const MAX_NOTE_LENGTH = 100;
export const MAX_VISITOR_NAME_LENGTH = 40;

// Control characters (newlines included) become spaces, so names and notes stay one line.
const oneLine = (s: string) => s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();

export const visitorNameSchema = z
  .string()
  .transform(oneLine)
  .pipe(
    z
      .string()
      .min(1, "Please type your first name.")
      .max(MAX_VISITOR_NAME_LENGTH, `Keep your name under ${MAX_VISITOR_NAME_LENGTH} characters.`),
  );

/** A blank note means "no note" (and removes one already sent). */
export const noteSchema = z
  .string()
  .transform(oneLine)
  .pipe(z.string().max(MAX_NOTE_LENGTH, `Keep your note to ${MAX_NOTE_LENGTH} characters.`))
  .transform((s) => s || null);

export const reactionRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("toggle"), kind: z.enum(REACTION_KINDS), name: visitorNameSchema.optional() }),
  z.object({ action: z.literal("note"), note: noteSchema, name: visitorNameSchema.optional() }),
]);

export type ReactionRequest = z.infer<typeof reactionRequestSchema>;

export function parseReactionRequest(raw: unknown): { ok: true; value: ReactionRequest } | { ok: false; error: string } {
  const result = reactionRequestSchema.safeParse(raw);
  if (result.success) return { ok: true, value: result.data };
  return { ok: false, error: result.error.issues[0]?.message ?? "That didn't work." };
}

/** Visitor ids are 22 base62 characters, like share ids. Anything else in the cookie is ignored. */
export function parseVisitorId(value: string | undefined): string | null {
  return value && /^[0-9A-Za-z]{22}$/.test(value) ? value : null;
}

export const VISITOR_COOKIE = "ss_visitor";
/** About two years: the name is asked for once per device. */
export const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 730;

export type ReactionCounts = Record<ReactionKind, number>;

/** What the Share Page shows a friend: counts for everyone, plus their own choices. */
export type PublicReactions = {
  counts: ReactionCounts;
  mine: ReactionKind[];
  note: string | null;
  /** The visitor's first name, if this device has given one. */
  name: string | null;
};

export function emptyCounts(): ReactionCounts {
  return { wow: 0, wish: 0, love: 0 };
}
