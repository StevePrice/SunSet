// The friend's visitor cookie (Phase 4b), set the first time they react or add to the story.
import { VISITOR_COOKIE, VISITOR_COOKIE_MAX_AGE } from "@/lib/reaction-input";

type CookieStore = { set: (name: string, value: string, options: Record<string, unknown>) => unknown };

export function setVisitorCookie(store: CookieStore, request: Request, visitorId: string): void {
  store.set(VISITOR_COOKIE, visitorId, {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: VISITOR_COOKIE_MAX_AGE,
  });
}
