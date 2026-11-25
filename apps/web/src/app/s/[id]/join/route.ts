import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { anonymous, isBot, REF_COOKIE, track } from "@/lib/analytics";
import { parseVisitorId, VISITOR_COOKIE } from "@/lib/reaction-input";

// "Start your own Journal" on a share page: counts the tap (PRD 3, the growth signal), remembers
// for a day that sign-up came from a share page, then goes to sign-up.
export async function GET(request: Request, ctx: RouteContext<"/s/[id]/join">) {
  const { id } = await ctx.params;
  if (!isBot((await headers()).get("user-agent"))) {
    const cookieStore = await cookies();
    const visitorId = parseVisitorId(cookieStore.get(VISITOR_COOKIE)?.value);
    // From a personal link: the person is in the photo (PRD 3: their sign-up rate vs. other friends).
    const personal = /^[0-9A-Za-z]{22}$/.test(new URL(request.url).searchParams.get("r") ?? "");
    const { distinctId, properties } = anonymous({ share_id: id, personal });
    await track("share_signup_tapped", visitorId ?? distinctId, properties);
    cookieStore.set(REF_COOKIE, "share", {
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60,
    });
  }
  redirect("/sign-in?mode=sign-up");
}
