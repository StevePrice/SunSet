import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { SignOutButton } from "./sign-out-button";

export const metadata = { title: "Your account · Sunset Soul" };

export default function AccountPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Your account</h1>
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <AccountDetails />
      </Suspense>
    </main>
  );
}

async function AccountDetails() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return (
    <div className="flex flex-col gap-4">
      <p>
        Signed in as <strong>{user.name}</strong>
        <br />
        <span className="text-zinc-600 dark:text-zinc-400">{user.email}</span>
      </p>
      <SignOutButton />
    </div>
  );
}
