// Scoring Worker. Consumes {entryId} messages the web app queues when a sunset is saved, scores
// the photo and writes the result to entry_scores. Retries transient failures; after the last
// attempt the score is marked failed so the app can offer "Try again".
import { entries, entryScores } from "@sunset/db/schema";
import * as schema from "@sunset/db/schema";
import { photoKey } from "@sunset/db/photos";
import { SCORER_VERSION } from "@sunset/scoring";
import { and, eq } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { SceneRefusedError, type ProviderName } from "./providers";
import { scorePhoto } from "./score";

export type ScoringMessage = { entryId: string; scorerVersion?: string; force?: boolean };

const MAX_ATTEMPTS = 3;
type Db = NodePgDatabase<typeof schema>;

function provider(env: Env): ProviderName {
  const configured = env.VISION_PROVIDER as string;
  return configured === "gemma" || configured === "gemma-fast" ? configured : "anthropic";
}

async function saveScore(db: Db, entryId: string, version: string, values: Partial<typeof entryScores.$inferInsert>) {
  await db
    .insert(entryScores)
    .values({ entryId, scorerVersion: version, ...values })
    .onConflictDoUpdate({ target: [entryScores.entryId, entryScores.scorerVersion], set: values });
}

async function handle(env: Env, db: Db, message: Message<ScoringMessage>): Promise<void> {
  const { entryId, force } = message.body;
  const version = message.body.scorerVersion ?? SCORER_VERSION;
  const [entry] = await db.select({ userId: entries.userId }).from(entries).where(eq(entries.id, entryId));
  if (!entry) return message.ack(); // deleted before it was scored

  const [existing] = await db
    .select({ status: entryScores.status })
    .from(entryScores)
    .where(and(eq(entryScores.entryId, entryId), eq(entryScores.scorerVersion, version)));
  if (!force && (existing?.status === "done" || existing?.status === "not_sunset")) return message.ack();

  try {
    const display = await env.PHOTOS.get(photoKey(entry.userId, entryId, "display"));
    if (!display) {
      await saveScore(db, entryId, version, { status: "failed", error: "Photo not found.", attempts: message.attempts });
      return message.ack();
    }
    const thumb = async () => (await env.PHOTOS.get(photoKey(entry.userId, entryId, "thumb")))!.arrayBuffer();
    const result = await scorePhoto(env, provider(env), await display.arrayBuffer(), thumb);
    await saveScore(db, entryId, version, {
      status: result.status,
      ...(result.status === "done"
        ? {
            palette: result.scores.palette,
            reach: result.scores.reach,
            setting: result.scores.setting,
            wow: result.scores.wow,
            composite: result.scores.composite,
            displayScore: result.scores.displayScore,
          }
        : {}),
      details: result.details,
      attempts: message.attempts,
      error: null,
      scoredAt: new Date(),
    });
    message.ack();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`Scoring ${entryId} failed (attempt ${message.attempts}):`, reason);
    const final = error instanceof SceneRefusedError || message.attempts >= MAX_ATTEMPTS;
    await saveScore(db, entryId, version, {
      status: final ? "failed" : "pending",
      error: reason.slice(0, 500),
      attempts: message.attempts,
    });
    if (final) message.ack();
    else message.retry({ delaySeconds: 10 * message.attempts });
  }
}

export default {
  async queue(batch: MessageBatch<ScoringMessage>, env: Env): Promise<void> {
    const client = new Client({ connectionString: env.HYPERDRIVE.connectionString });
    await client.connect();
    try {
      const db = drizzle(client, { schema });
      for (const message of batch.messages) await handle(env, db, message);
    } finally {
      await client.end();
    }
  },

  // Local-only endpoint for the calibration script: POST a JPEG to /dev/score?provider=gemma.
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (env.ENABLE_DEV_ENDPOINT !== "true" || request.method !== "POST" || url.pathname !== "/dev/score") {
      return new Response("Not found", { status: 404 });
    }
    const requested = url.searchParams.get("provider");
    const chosen: ProviderName = requested === "gemma" || requested === "gemma-fast" ? requested : "anthropic";
    try {
      return Response.json(await scorePhoto(env, chosen, await request.arrayBuffer()));
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
    }
  },
} satisfies ExportedHandler<Env, ScoringMessage>;
