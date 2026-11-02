import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = { title: "Reset password · Sunset Soul" };

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Choose a new password</h1>
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
