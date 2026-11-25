// Errors from people's browsers (the error page), written to the Worker's logs so they show up in
// Cloudflare Workers Logs next to server errors (Phase 7a: monitoring with Cloudflare, no Sentry).

export const MAX_CLIENT_ERROR_FIELD = 500;

export type ClientError = { message: string; digest: string | null; path: string | null };

function field(value: unknown, max = MAX_CLIENT_ERROR_FIELD): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/** Keeps only short strings; the path loses its query string, which could hold anything. */
export function parseClientError(raw: unknown): ClientError | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  const message = field(body.message);
  if (!message) return null;
  const path = field(body.path, 200)?.split(/[?#]/)[0] ?? null;
  return { message, digest: field(body.digest, 100), path };
}
