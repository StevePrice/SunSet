"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="w-full inline-flex min-h-13 min-w-12 items-center justify-center gap-2 rounded-ss-md px-5 py-2 text-center text-label font-bold disabled:opacity-50 border border-border-subtle bg-transparent text-ink hover:bg-surface-raised"
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
