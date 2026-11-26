import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { anonymous, isBot, REF_COOKIE, track } from "@/lib/analytics";
import { parseVisitorId, VISITOR_COOKIE } from "@/lib/reaction-input";

// "Start your own Journal" on a set page (4f-5): counted like the single Share Page's, then sign-up.
export async function GET(request: Request, ctx: RouteContext<"/s/set/[id]/join">) {
  const { id } = await ctx.params;
  if (!isBot((await headers()).get("user-agent"))) {
    const cookieStore = await cookies();
    const visitorId = parseVisitorId(cookieStore.get(VISITOR_COOKIE)?.value);
    // A set is always for the person named in its sunsets.
    const { distinctId, properties } = anonymous({ set_id: id, personal: true, set: true });
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
