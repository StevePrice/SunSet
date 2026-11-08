// A fixed-window counter in the shared rate_limits table (the one Better Auth's limiter uses, so
// it works across Worker isolates). Our keys start with a prefix Better Auth never uses. Here
// last_request holds the start of the current window.
import { sql } from "drizzle-orm";
import { rateLimits } from "@/db/schema";
import type { Db } from "@/lib/db";

/** Counts one hit against `key`; false once more than `limit` hits land in the window. */
export async function hitRateLimit(db: Db, key: string, limit: number, windowMs: number, now = Date.now()): Promise<boolean> {
  const expired = sql`${rateLimits.lastRequest} < ${now - windowMs}`;
  const [row] = await db
    .insert(rateLimits)
    .values({ id: crypto.randomUUID(), key, count: 1, lastRequest: now })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${expired} then 1 else ${rateLimits.count} + 1 end`,
        lastRequest: sql`case when ${expired} then ${now} else ${rateLimits.lastRequest} end`,
      },
    })
    .returning({ count: rateLimits.count });
  return row.count <= limit;
}

/** The visitor's IP as Cloudflare reports it (the header Better Auth's limiter keys on too). */
export function clientIp(headers: Headers): string {
  return headers.get("cf-connecting-ip") ?? "unknown";
}
