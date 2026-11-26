// Add to the story (Phase 4f-4, PRD 6.10e): the rules for what a friend adds on the Share Page.
// Kept free of database code so the client and the tests can import it.
import { z } from "zod";
import { recipientTokenSchema, visitorNameSchema } from "@/lib/reaction-input";

/** Longer than a note (100), short enough to read at a glance. PRD open question: "about 500". */
export const MAX_ADDITION_LENGTH = 500;

/** A friend's recording stops itself at 1 minute (PRD 6.10e). */
export const MAX_ADDITION_SECONDS = 60;

/** Paragraphs are kept; other control characters and runs of spaces are tidied. Blank means none. */
export const additionTextSchema = z
  .string()
  .transform((s) =>
    s
      .replace(/\r\n?/g, "\n")
      .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  )
  .pipe(z.string().max(MAX_ADDITION_LENGTH, `Keep it to ${MAX_ADDITION_LENGTH} characters.`))
  .transform((s) => s || null);

/**
 * Send: the words (typed, or the recording's words as the friend left them), and whether to keep
 * the recording. `spoken: false` drops any recording, so switching back to typing sends only text.
 */
export const additionRequestSchema = z.object({
  text: additionTextSchema,
  spoken: z.boolean(),
  name: visitorNameSchema.optional(),
  recipient: recipientTokenSchema.optional(),
});

export type AdditionRequest = z.infer<typeof additionRequestSchema>;

export function parseAdditionRequest(raw: unknown): { ok: true; value: AdditionRequest } | { ok: false; error: string } {
  const result = additionRequestSchema.safeParse(raw);
  if (result.success) return { ok: true, value: result.data };
  return { ok: false, error: result.error.issues[0]?.message ?? "That didn't work." };
}

/** What the Share Page knows about this visitor's own addition, to show it back after a reload. */
export type MyAddition = {
  text: string | null;
  /** A recording is kept with it. */
  spoken: boolean;
  durationMs: number | null;
  sent: boolean;
};
