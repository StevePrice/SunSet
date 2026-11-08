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
        className="min-h-12 w-full min-w-0 rounded-ss-md border border-border-subtle bg-surface-raised px-3 py-2 text-ink placeholder:text-ink-muted"
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
        className="w-full inline-flex min-h-13 min-w-12 items-center justify-center gap-2 rounded-ss-md px-5 py-2 text-center text-label font-bold disabled:opacity-50 bg-action text-on-action hover:bg-action/90"
      >
        Change password
      </button>
      {error && <p role="alert" className="rounded-ss-md border border-border-subtle bg-surface-raised p-3 text-ink">{error}</p>}
    </form>
  );
}
