// Claude calls for AI Story Capture. Questions use Haiku with thinking off, for speed. Stories use
// Sonnet: in the comparison on the guide's worked examples, Haiku added details the user never
// said, which the guide forbids. STORY_MODEL overrides it.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import type { StoryTurn } from "@/db/schema";
import {
  FOLLOW_UP_PROMPT,
  followUpSchema,
  interviewText,
  OPENERS_PROMPT,
  openersSchema,
  SAID_PROMPT,
  saidInput,
  saidSchema,
  storyPrompt,
  storySchema,
  type StoryStyle,
} from "./prompts";

export const QUESTION_MODEL = "claude-haiku-5-5";
export const DEFAULT_STORY_MODEL = "claude-sonnet-5-5";

export type Usage = { inputTokens: number; outputTokens: number };
export type AiEnv = { ANTHROPIC_API_KEY: string; STORY_MODEL?: string };

/** The model declined; the caller falls back (fixed questions, or the user's own words). */
export class StoryAiError extends Error {}

type Content = Anthropic.Messages.MessageParam["content"];

const image = (jpeg: ArrayBuffer) =>
  ({
    type: "image",
    source: { type: "base64", media_type: "image/jpeg", data: Buffer.from(jpeg).toString("base64") },
  }) as const;

async function ask<S extends z.ZodType>(
  env: AiEnv,
  options: { model: string; system: string; content: Content; schema: S; fast: boolean },
): Promise<{ output: z.infer<S>; usage: Usage }> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 45_000 });
  const response = await client.messages.parse({
    model: options.model,
    max_tokens: 4000,
    system: options.system,
    ...(options.fast && { thinking: { type: "disabled" } }),
    output_config: { effort: "low", format: zodOutputFormat(options.schema) },
    messages: [{ role: "user", content: options.content }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new StoryAiError(`No usable answer (stop_reason ${response.stop_reason}).`);
  }
  return {
    output: response.parsed_output as z.infer<S>,
    usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
  };
}

export async function openingQuestions(env: AiEnv, photo: ArrayBuffer, asked: string[]) {
  const already = asked.length ? `Already asked:\n${asked.map((q) => `- ${q}`).join("\n")}` : "Nothing asked yet.";
  const { output, usage } = await ask(env, {
    model: QUESTION_MODEL,
    system: OPENERS_PROMPT,
    content: [image(photo), { type: "text", text: `${already}\n\nWrite three opening questions for this photo.` }],
    schema: openersSchema,
    fast: true,
  });
  const questions = output.questions.map((q) => q.trim()).filter(Boolean).slice(0, 3);
  if (questions.length < 3) throw new StoryAiError("Fewer than three questions.");
  return { questions, usage };
}

export async function followUp(env: AiEnv, turns: StoryTurn[], asked: string[]) {
  const { output, usage } = await ask(env, {
    model: QUESTION_MODEL,
    system: FOLLOW_UP_PROMPT,
    content: [{ type: "text", text: `${interviewText(turns, asked)}\n\nWrite the next follow-up question.` }],
    schema: followUpSchema,
    fast: true,
  });
  return { ...output, question: output.question.trim(), usage };
}

export async function writeStory(
  env: AiEnv,
  style: StoryStyle,
  turns: StoryTurn[],
  photo: ArrayBuffer | null,
  detected: string[],
) {
  const withPhoto = style === "crafted-photo" && photo;
  const detectedText = withPhoto && detected.length ? `\n\nStriking in the photo: ${detected.join(" ")}` : "";
  const text = `${interviewText(turns)}${detectedText}\n\nWrite the story.`;
  const { output, usage } = await ask(env, {
    model: env.STORY_MODEL || DEFAULT_STORY_MODEL,
    system: storyPrompt(style),
    content: withPhoto ? [image(photo), { type: "text", text }] : [{ type: "text", text }],
    schema: storySchema,
    fast: false,
  });
  return { story: output.story.trim(), title: output.title.trim(), caption: output.caption.trim(), usage };
}

/** Cleans the spoken answers for "What you said"; one cleaned answer per spoken answer, in order. */
export async function cleanTranscripts(env: AiEnv, spoken: string[]) {
  const { output, usage } = await ask(env, {
    model: QUESTION_MODEL,
    system: SAID_PROMPT,
    content: [{ type: "text", text: saidInput(spoken) }],
    schema: saidSchema,
    fast: true,
  });
  if (output.answers.length !== spoken.length) throw new StoryAiError("Wrong number of cleaned answers.");
  return { answers: output.answers, usage };
}
