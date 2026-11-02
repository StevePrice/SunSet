import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Client } from "pg";

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
