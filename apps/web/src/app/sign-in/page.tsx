import { connection } from "next/server";
import { Suspense } from "react";
import { getEnabledSocialProviders } from "@/lib/auth";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Sign in · Sunset Soul" };

export default function SignInPage(props: PageProps<"/sign-in">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Sign in to Sunset Soul</h1>
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <SignInOptions searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function SignInOptions({ searchParams }: { searchParams: PageProps<"/sign-in">["searchParams"] }) {
  // Which providers are configured is a runtime setting, not something to bake in at build.
  await connection();
  const providers = await getEnabledSocialProviders();
  // "Start your own Journal" on a Share Page links here with ?mode=sign-up.
  const { mode } = await searchParams;
  return <SignInForm providers={providers} initialMode={mode === "sign-up" ? "sign-up" : "magic-link"} />;
}
