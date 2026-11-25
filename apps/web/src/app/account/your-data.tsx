"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { buttonClass } from "@/components/button";
import { noticeClass } from "@/components/styles";
import { deleteMyAccountAction } from "./actions";

/**
 * You → Your data (Phase 7a user rights): download everything as a ZIP, or delete the account.
 * Delete asks twice: a confirm, then typing DELETE, since it can't be undone.
 */
export function YourData() {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <section className="flex flex-col gap-3" aria-labelledby="your-data">
      <h2 id="your-data" className="font-serif text-title-3">
        Your data
      </h2>
      <p className="text-caption text-ink-muted">
        A ZIP with every photo, story, recording and the reactions friends sent, plus a file you can open in any app.
      </p>
      <a href="/api/export" className={buttonClass("secondary", "w-full")} download>
        Download your sunsets
      </a>
      <p className="text-caption text-ink-muted">
        How we look after it: the <Link href="/privacy" className="underline">Privacy policy</Link>.
      </p>

      {confirming ? (
        <div className="flex flex-col gap-3 rounded-ss-lg bg-surface-raised p-4">
          <p>
            This deletes your account, every sunset, photo, recording and share link, and the reactions on them. Links you
            shared stop working. <strong>It can&apos;t be undone.</strong>
          </p>
          <label className="flex flex-col gap-1 text-caption">
            Type DELETE to confirm
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoCapitalize="characters"
              autoComplete="off"
              className="min-h-12 w-full rounded-ss-md border border-border-subtle bg-surface px-3 py-2 text-ink"
            />
          </label>
          {error && (
            <p role="alert" className={noticeClass}>
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={pending || typed.trim().toUpperCase() !== "DELETE"}
            className={buttonClass("secondary", "w-full")}
            onClick={() =>
              start(async () => {
                const result = await deleteMyAccountAction();
                if (result?.error) setError(result.error);
              })
            }
          >
            {pending ? "Deleting…" : "Delete my account and everything in it"}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="inline-flex min-h-12 items-center self-center text-label underline">
            Keep my account
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => confirm("Delete your account and all your sunsets? You'll be asked to confirm again.") && setConfirming(true)}
          className="inline-flex min-h-12 items-center self-start text-label text-ink-muted underline"
        >
          Delete my account
        </button>
      )}
    </section>
  );
}
