"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm() {
  const token = useSearchParams().get("token");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return <p>This reset link is invalid or has expired. <Link className="underline" href="/sign-in">Request a new one</Link>.</p>;
  }
  if (done) {
    return <p>Your password has been changed. <Link className="underline" href="/sign-in">Sign in</Link>.</p>;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await authClient.resetPassword({ newPassword: password, token: token! });
    setBusy(false);
    if (result.error) setError(result.error.message ?? "Couldn't reset the password. Please try again.");
    else setDone(true);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        type="password"
        placeholder="New password (at least 10 characters)"
        autoComplete="new-password"
        minLength={10}
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700 disabled:opacity-50"
      >
        Change password
      </button>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    </form>
  );
}
