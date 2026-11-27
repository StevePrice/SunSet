// Product analytics (Phase 7a): the PRD's success metrics, sent to PostHog from the server.
//
// What goes out: an event name, an opaque id (the user's id, a reacting friend's visitor id, or a
// random id for an anonymous view) and yes/no facts or counts. Never a name, email, story, title,
// place, location or photo. No script runs in the browser and no cookie is set for analytics.
// Without POSTHOG_KEY nothing is sent (local development, CI, tests).
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { count, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { entries, entryPeople, shares, storyClips } from "@/db/schema";
import type { Db } from "@/lib/db";

/** Set by /s/[id]/join so sign-up can tell it came from a share page. Holds only the word "share". */
export const REF_COOKIE = "ss_ref";

export const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

export type AnalyticsEvent =
  | "signed_up"
  | "entry_saved"
  | "story_saved"
  | "story_polished"
  | "names_added"
  | "journal_filtered"
  | "entry_shared"
  | "share_page_viewed"
  | "share_signup_tapped"
  | "reaction_received"
  | "note_received"
  | "story_added"
  | "set_shared"
  | "set_page_viewed"
  | "set_reaction_received"
  | "set_note_received"
  | "account_deleted"
  | "data_exported";

export type Properties = Record<string, string | number | boolean | null>;

type PostHogEnv = { POSTHOG_KEY?: string; POSTHOG_HOST?: string };

/** The request PostHog's capture endpoint expects, or null when analytics are off. */
export function captureRequest(
  env: PostHogEnv,
  event: AnalyticsEvent,
  distinctId: string,
  properties: Properties = {},
  now = new Date(),
): { url: string; init: RequestInit } | null {
  if (!env.POSTHOG_KEY) return null;
  const host = (env.POSTHOG_HOST || DEFAULT_POSTHOG_HOST).replace(/\/+$/, "");
  const body = {
    api_key: env.POSTHOG_KEY,
    event,
    distinct_id: distinctId,
    timestamp: now.toISOString(),
    properties: {
      ...properties,
      // Server-side events: PostHog shouldn't guess a location from the Worker's IP.
      $ip: null,
      $lib: "sunset-server",
    },
  };
  return {
    url: `${host}/i/v0/e/`,
    init: { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
  };
}

/** For anonymous events (share page views): counted, but no person profile is made. */
export function anonymous(properties: Properties = {}): { distinctId: string; properties: Properties } {
  return { distinctId: `anon-${crypto.randomUUID()}`, properties: { ...properties, $process_person_profile: false } };
}

/**
 * Sends the event after the response, so analytics never slow a page down or break it. Errors are
 * logged and dropped.
 */
export async function track(event: AnalyticsEvent, distinctId: string, properties: Properties = {}): Promise<void> {
  try {
    // The smoke tests run in headless Chrome against staging; they aren't people.
    if (/HeadlessChrome/.test((await headers()).get("user-agent") ?? "")) return;
    const { env, ctx } = await getCloudflareContext({ async: true });
    const request = captureRequest(env as PostHogEnv, event, distinctId, properties);
    if (!request) return;
    ctx.waitUntil(
      fetch(request.url, request.init)
        .then((response) => {
          if (!response.ok) console.error(`Analytics ${event}: PostHog answered ${response.status}`);
        })
        .catch((error) => console.error(`Analytics ${event} failed:`, error)),
    );
  } catch (error) {
    console.error(`Analytics ${event} failed:`, error);
  }
}

/** Facts about an entry that metrics are split by (PRD 3: photos with people vs. without). */
export async function entryFacts(db: Db, entryId: string): Promise<Properties> {
  const [row] = await db
    .select({ hasPeople: entries.hasPeople, peopleCount: entries.peopleCount, story: entries.story })
    .from(entries)
    .where(eq(entries.id, entryId));
  if (!row) return { entry_id: entryId };
  const [clips] = await db.select({ n: count() }).from(storyClips).where(eq(storyClips.entryId, entryId));
  const [named] = await db.select({ n: count() }).from(entryPeople).where(eq(entryPeople.entryId, entryId));
  return {
    entry_id: entryId,
    // null until the scorer has looked at the photo.
    has_people: row.hasPeople,
    people_count: row.peopleCount,
    has_story: Boolean(row.story?.trim()),
    has_voice: (clips?.n ?? 0) > 0,
    // Names the owner added (4f-2); the count only, never the names.
    names_count: named?.n ?? 0,
  };
}

/** entryFacts for the entry behind a share link, plus the share's id. */
export async function shareFacts(db: Db, shareId: string): Promise<Properties> {
  const [row] = await db.select({ entryId: shares.entryId }).from(shares).where(eq(shares.id, shareId));
  return row ? { share_id: shareId, ...(await entryFacts(db, row.entryId)) } : { share_id: shareId };
}

/** Link-preview fetchers (iMessage, WhatsApp, Slack…) open share pages too; they aren't visitors. */
export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return true;
  return /bot|crawler|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|embedly|curl|wget|python|headless/i.test(
    userAgent,
  );
}

/** A story's length as a bucket, so the length itself (and nothing of the words) is what's sent. */
export function wordBucket(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return "0";
  if (words < 20) return "1-19";
  if (words < 50) return "20-49";
  if (words < 100) return "50-99";
  if (words < 200) return "100-199";
  return "200+";
}
