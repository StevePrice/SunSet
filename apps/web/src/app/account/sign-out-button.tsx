"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="w-full rounded-lg border border-zinc-300 px-4 py-2 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
      onClick={async () => {
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
