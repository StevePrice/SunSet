// Vision providers behind one interface, so the scorer (and the comparison) can switch models.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { parseScene, SCENE_PROMPT, sceneSchema, type SceneReport } from "@sunset/scoring";
import { z } from "zod";

export type ProviderName = "anthropic" | "gemma" | "gemma-fast";

export type SceneResult = {
  scene: SceneReport;
  model: string;
  usage: { inputTokens?: number; outputTokens?: number };
};

/** The model declined to look at the photo; retrying won't change that. */
export class SceneRefusedError extends Error {}

const USER_TEXT = "Report what you see in this photo.";
export const ANTHROPIC_MODEL = "claude-haiku-5-5";
export const GEMMA_MODEL = "@cf/google/gemma-4-26b-a4b-it";

const toBase64 = (bytes: ArrayBuffer) => Buffer.from(bytes).toString("base64");

async function anthropicScene(env: Env, jpeg: ArrayBuffer): Promise<SceneResult> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const response = await client.messages.parse({
    model: ANTHROPIC_MODEL,
    max_tokens: 4000,
    system: SCENE_PROMPT,
    output_config: { effort: "low", format: zodOutputFormat(sceneSchema) },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: toBase64(jpeg) } },
          { type: "text", text: USER_TEXT },
        ],
      },
    ],
  });
  if (response.stop_reason === "refusal") throw new SceneRefusedError("The model declined to rate this photo.");
  const scene = parseScene(response.parsed_output);
  if (!scene) throw new Error(`Unparseable scene report (stop_reason ${response.stop_reason}).`);
  return {
    scene,
    model: ANTHROPIC_MODEL,
    usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
  };
}

async function gemmaScene(env: Env, jpeg: ArrayBuffer, thinking: boolean): Promise<SceneResult> {
  const output = await env.AI.run(GEMMA_MODEL, {
    messages: [
      {
        role: "system",
        content: `${SCENE_PROMPT}\n\nReply with only a JSON object matching this JSON Schema:\n${JSON.stringify(z.toJSONSchema(sceneSchema))}`,
      },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${toBase64(jpeg)}` } },
          { type: "text", text: USER_TEXT },
        ],
      },
    ],
    // Workers AI's json_schema mode produced malformed JSON for this model; JSON-object mode
    // with the schema in the prompt is reliable.
    response_format: { type: "json_object" },
    temperature: 0,
    max_tokens: 2000,
    // Reasoning is on by default and makes calls ~4x slower; "gemma-fast" turns it off.
    chat_template_kwargs: { enable_thinking: thinking },
  });
  const content = output.choices[0]?.message?.content;
  let raw: unknown = null;
  try {
    raw = typeof content === "string" ? JSON.parse(content) : content;
  } catch {
    // Falls through to the unparseable error below.
  }
  const scene = parseScene(raw);
  if (!scene) {
    const preview = typeof content === "string" ? content.slice(0, 300) : JSON.stringify(content)?.slice(0, 300);
    throw new Error(`Unparseable scene report from Gemma (finish_reason ${output.choices[0]?.finish_reason}): ${preview}`);
  }
  return {
    scene,
    model: thinking ? GEMMA_MODEL : `${GEMMA_MODEL} (no reasoning)`,
    usage: { inputTokens: output.usage?.prompt_tokens, outputTokens: output.usage?.completion_tokens },
  };
}

export function detectScene(env: Env, provider: ProviderName, jpeg: ArrayBuffer): Promise<SceneResult> {
  if (provider === "anthropic") return anthropicScene(env, jpeg);
  return gemmaScene(env, jpeg, provider === "gemma");
}
