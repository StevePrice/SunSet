import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth";
import { WelcomeForm } from "./welcome-form";

export const metadata = { title: "Welcome · Sunset Soul" };

// Welcome / first name (Phase 4e, Build Spec 3.1): shown once, after the first sign-in, when the
// account has no first name (the Journal sends people here). No header button and no bottom bar.
export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.name.trim()) redirect("/journal");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-4 pt-10 pb-8">
      <Logo width={135} />
      <div className="flex flex-col gap-3">
        <h1 className="font-serif text-display">Welcome to Sunset Soul</h1>
        <p className="ss-story text-ink-story">Your sunsets, your stories, shared with family and friends.</p>
      </div>
      <hr className="border-divider" />
      <WelcomeForm />
    </main>
  );
}
