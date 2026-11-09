// The one gate every AI call goes through (Claude and Workers AI alike): it refuses when the user
// has turned AI story help off or reached the daily limit, and records each call it makes.
import type { Db } from "@/lib/db";
import { getStorySettings, storyHelpAllowed } from "@/lib/settings";
import { aiCallsToday, DAILY_AI_LIMIT, recordAiCall } from "./sessions";

export type AiUsage = { inputTokens: number; outputTokens: number } | null;

/** The result, or "off" (AI help turned off), "limited" (daily cap) or null (the call failed). */
export async function withAi<T extends { usage: AiUsage }>(
  db: Db,
  userId: string,
  kind: string,
  call: () => Promise<T>,
): Promise<T | "off" | "limited" | null> {
  if (!storyHelpAllowed(await getStorySettings(db, userId))) return "off";
  if ((await aiCallsToday(db, userId)) >= DAILY_AI_LIMIT) return "limited";
  const started = Date.now();
  try {
    const result = await call();
    const tokens = result.usage ? `, ${result.usage.inputTokens} in / ${result.usage.outputTokens} out` : "";
    console.log(`Story AI ${kind}: ${Date.now() - started} ms${tokens}`);
    await recordAiCall(db, userId, kind, result.usage);
    return result;
  } catch (error) {
    console.error(`Story AI ${kind} failed after ${Date.now() - started} ms:`, error);
    await recordAiCall(db, userId, kind, null);
    return null;
  }
}
