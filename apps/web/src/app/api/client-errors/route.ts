import { withDrizzle } from "@/lib/db";
import { parseClientError } from "@/lib/client-errors";
import { clientIp, hitRateLimit } from "@/lib/rate-limit";

const IP_LIMIT = 20;
const IP_WINDOW_MS = 10 * 60 * 1000;

// The error page reports what broke. Logged with a fixed prefix so Workers Logs can filter on it.
export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return new Response(null, { status: 415 });
  }
  const report = parseClientError(await request.json().catch(() => null));
  if (!report) return new Response(null, { status: 400 });
  const allowed = await withDrizzle((db) => hitRateLimit(db, `client-errors:ip:${clientIp(request.headers)}`, IP_LIMIT, IP_WINDOW_MS));
  if (!allowed) return new Response(null, { status: 429 });
  console.error("CLIENT ERROR", JSON.stringify({ ...report, userAgent: request.headers.get("user-agent")?.slice(0, 200) ?? null }));
  return new Response(null, { status: 204 });
}
