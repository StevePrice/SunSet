"use client";

import { useState, useTransition } from "react";
import {
  deleteAccountAction,
  setDisabledAction,
  setRoleAction,
  signOutEverywhereAction,
  type AccountResult,
} from "./actions";

const button =
  "inline-flex min-h-10 items-center justify-center rounded-ss-md border border-border-subtle bg-transparent px-3 py-1 text-caption font-bold text-ink hover:bg-surface-raised disabled:opacity-50";

// The actions for one row of the users table. The server checks every rule again; the disabled
// buttons here only save a click that would be refused.
export function UserActions({
  userId,
  role,
  disabled,
  isSelf,
}: {
  userId: string;
  role: string;
  disabled: boolean;
  isSelf: boolean;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();

  function run(task: () => Promise<AccountResult>, success: string) {
    setMessage(null);
    start(async () => {
      const result = await task();
      setMessage(result ? result.error : success);
      setConfirmDelete(false);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={button}
          disabled={pending || (isSelf && role === "admin")}
          onClick={() => run(() => setRoleAction(userId, role === "admin" ? "user" : "admin"), "Role changed.")}
        >
          {role === "admin" ? "Make user" : "Make admin"}
        </button>
        <button
          type="button"
          className={button}
          disabled={pending || (isSelf && !disabled)}
          onClick={() => run(() => setDisabledAction(userId, !disabled), disabled ? "Account enabled." : "Account disabled.")}
        >
          {disabled ? "Enable" : "Disable"}
        </button>
        <button
          type="button"
          className={button}
          disabled={pending}
          onClick={() => run(() => signOutEverywhereAction(userId), "Signed out everywhere.")}
        >
          Sign out everywhere
        </button>
        {confirmDelete ? (
          <>
            <button type="button" className={button} disabled={pending} onClick={() => run(() => deleteAccountAction(userId), "Account deleted.")}>
              Yes, delete everything
            </button>
            <button type="button" className={button} disabled={pending} onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" className={button} disabled={pending || isSelf} onClick={() => setConfirmDelete(true)}>
            Delete…
          </button>
        )}
      </div>
      {confirmDelete && (
        <p className="text-caption text-ink-muted">Deletes the account, its sunsets, photos, recordings and share links. This can&apos;t be undone.</p>
      )}
      {message && (
        <p role="status" className="text-caption text-ink-muted">
          {message}
        </p>
      )}
    </div>
  );
}
