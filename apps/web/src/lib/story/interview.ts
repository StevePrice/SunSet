// What "That's my story" / "See my story" should do on the Interview screen. An answer still in
// the box (typed, or a voice transcript waiting to be checked) is saved first: dropping it would
// lose words the user has said, and its recording would end up attached to nothing.
export const SHORT_ANSWER_WORDS = 15;

export type FinishStep = "save-then-finish" | "offer-one-more" | "finish";

export function finishStep({
  pending,
  answers,
  hasNextQuestion,
  offeredOneMore,
}: {
  /** Text still in the answer box. */
  pending: string;
  /** Answers already saved, in order. */
  answers: string[];
  hasNextQuestion: boolean;
  offeredOneMore: boolean;
}): FinishStep {
  if (pending.trim()) return "save-then-finish";
  const short = answers.length === 1 && answers[0].split(/\s+/).length < SHORT_ANSWER_WORDS;
  if (short && hasNextQuestion && !offeredOneMore) return "offer-one-more";
  return "finish";
}
