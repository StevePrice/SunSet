"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/button";
import { fieldClass, noticeClass } from "@/components/styles";
import { MAX_FIRST_NAME_LENGTH } from "@/lib/first-name";
import { saveFirstNameAction } from "../account/actions";

export function WelcomeForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const preview = name.trim() || "Your name";

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveFirstNameAction(name);
      if ("error" in result) setError(result.error);
      else router.replace("/journal");
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-serif text-title-2">What&apos;s your first name?</h2>
        <p>Friends see it when you share a sunset.</p>
      </div>

      <div className="flex flex-col gap-1 rounded-ss-lg bg-surface-sunken p-4" aria-live="polite">
        <p className="text-caption text-ink-muted">What friends will see</p>
        <p>
          <strong>{preview}</strong> shared a sunset with you
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="first-name" className="text-label font-bold">
          First name
        </label>
        <input
          id="first-name"
          className={fieldClass}
          autoComplete="given-name"
          maxLength={MAX_FIRST_NAME_LENGTH}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          aria-describedby="first-name-hint"
        />
        <p id="first-name-hint" className="text-caption text-ink-muted">
          You can change it later in your account.
        </p>
      </div>

      {error && (
        <p role="alert" className={noticeClass}>
          {error}
        </p>
      )}

      <Button type="submit" variant="action" className="mt-auto w-full" disabled={pending}>
        {pending ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
