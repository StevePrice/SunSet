"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

type Mode = "magic-link" | "sign-in" | "sign-up" | "forgot";
type Providers = { google: boolean; apple: boolean };

const inputClass = "w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";
const buttonClass =
  "w-full rounded-lg bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700 disabled:opacity-50";
const secondaryButtonClass =
  "w-full rounded-lg border border-zinc-300 px-4 py-2 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900";

export function SignInForm({ providers }: { providers: Providers }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("magic-link");
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
    const callbackURL = "/account";
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
    const result = await authClient.signIn.social({ provider, callbackURL: "/account" });
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
          <p className="text-center text-sm text-zinc-500">or use your email</p>
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

      {notice && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <nav className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
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
