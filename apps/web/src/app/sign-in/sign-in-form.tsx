"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

type Mode = "magic-link" | "sign-in" | "sign-up" | "forgot";
type Providers = { google: boolean; apple: boolean };

const inputClass = "min-h-12 w-full min-w-0 rounded-ss-md border border-border-subtle bg-surface-raised px-3 py-2 text-ink placeholder:text-ink-muted";
const buttonClass =
  "w-full inline-flex min-h-13 min-w-12 items-center justify-center gap-2 rounded-ss-md px-5 py-2 text-center text-label font-bold disabled:opacity-50 bg-action text-on-action hover:bg-action/90";
const secondaryButtonClass =
  "w-full inline-flex min-h-13 min-w-12 items-center justify-center gap-2 rounded-ss-md px-5 py-2 text-center text-label font-bold disabled:opacity-50 border border-border-subtle bg-transparent text-ink hover:bg-surface-raised";

export function SignInForm({ providers, initialMode = "magic-link" }: { providers: Providers; initialMode?: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setNotice(null);
    setError(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    setError(null);
    const callbackURL = "/journal";
    const result =
      mode === "magic-link"
        ? await authClient.signIn.magicLink({ email, callbackURL })
        : mode === "sign-in"
          ? await authClient.signIn.email({ email, password, callbackURL })
          : mode === "sign-up"
            ? await authClient.signUp.email({ name, email, password, callbackURL })
            : await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    setBusy(false);
    if (result.error) {
      setError(
        result.error.status === 403
          ? "Please confirm your email first. We've sent you a new confirmation link."
          : (result.error.message ?? "Something went wrong. Please try again."),
      );
      return;
    }
    if (mode === "sign-in") {
      router.push(callbackURL);
      return;
    }
    setNotice(
      mode === "sign-up"
        ? "Check your email to confirm your account."
        : mode === "forgot"
          ? "If that email has an account, we've sent a link to reset the password."
          : "Check your email for a sign-in link.",
    );
  }

  async function signInWith(provider: "google" | "apple") {
    setError(null);
    const result = await authClient.signIn.social({ provider, callbackURL: "/journal" });
    if (result.error) setError(result.error.message ?? "Sign-in failed. Please try again.");
  }

  return (
    <div className="flex flex-col gap-6">
      {(providers.google || providers.apple) && (
        <div className="flex flex-col gap-3">
          {providers.apple && (
            <button type="button" className={secondaryButtonClass} onClick={() => signInWith("apple")}>
              Continue with Apple
            </button>
          )}
          {providers.google && (
            <button type="button" className={secondaryButtonClass} onClick={() => signInWith("google")}>
              Continue with Google
            </button>
          )}
          <p className="text-center text-caption text-ink-muted">or use your email</p>
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {mode === "sign-up" && (
          <input
            className={inputClass}
            placeholder="Your name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <input
          className={inputClass}
          type="email"
          placeholder="Email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {(mode === "sign-in" || mode === "sign-up") && (
          <input
            className={inputClass}
            type="password"
            placeholder={mode === "sign-up" ? "Password (at least 10 characters)" : "Password"}
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
            minLength={mode === "sign-up" ? 10 : undefined}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
        <button type="submit" className={buttonClass} disabled={busy}>
          {mode === "magic-link"
            ? "Email me a sign-in link"
            : mode === "sign-in"
              ? "Sign in"
              : mode === "sign-up"
                ? "Create account"
                : "Send reset link"}
        </button>
      </form>

      {notice && <p className="rounded-ss-md border border-border-subtle bg-surface-raised p-3 text-ink">{notice}</p>}
      {error && (
        <p role="alert" className="rounded-ss-md border border-border-subtle bg-surface-raised p-3 text-ink">
          {error}
        </p>
      )}

      <nav className="flex flex-col gap-1 text-caption text-ink-muted">
        {mode !== "magic-link" && (
          <button type="button" className="text-left underline" onClick={() => switchMode("magic-link")}>
            Sign in with an email link instead
          </button>
        )}
        {mode !== "sign-in" && (
          <button type="button" className="text-left underline" onClick={() => switchMode("sign-in")}>
            Sign in with a password
          </button>
        )}
        {mode !== "sign-up" && (
          <button type="button" className="text-left underline" onClick={() => switchMode("sign-up")}>
            Create an account with a password
          </button>
        )}
        {mode === "sign-in" && (
          <button type="button" className="text-left underline" onClick={() => switchMode("forgot")}>
            Forgot your password?
          </button>
        )}
      </nav>
    </div>
  );
}
