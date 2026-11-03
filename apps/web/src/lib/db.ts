import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "@/db/schema";

export type Db = NodePgDatabase<typeof schema>;

// Hyperdrive pools connections on Cloudflare's side, so each request opens its own client.
export async function withDb<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const { env, ctx } = await getCloudflareContext({ async: true });
  const client = new Client({ connectionString: env.HYPERDRIVE.connectionString });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    ctx.waitUntil(client.end());
  }
}

export function withDrizzle<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  return withDb((client) => fn(drizzle(client, { schema })));
}
