"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { createShareAction, stopSharingAction, updateSharePlaceAction, type ShareLink } from "../actions";
import { MAX_PLACE_LENGTH } from "@/lib/shares";

// Creating the link is a separate tap from opening the share sheet: iOS only opens the sheet
// straight from a tap, not after waiting on the server.
export function SharePanel({ entryId, initial }: { entryId: string; initial: ShareLink | null }) {
  const [share, setShare] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [placeState, placeAction, placePending] = useActionState(
    async (prev: Awaited<ReturnType<typeof updateSharePlaceAction>>, form: FormData) => {
      const result = await updateSharePlaceAction(entryId, prev, form);
      if (!result) setShare((s) => s && { ...s, place: String(form.get("place") ?? "").trim() || null });
      return result;
    },
    null,
  );

  // The share sheet only exists in the browser; the server renders without it.
  const canShare = useSyncExternalStore(
    () => () => {},
    () => typeof navigator.share === "function",
    () => false,
  );

  async function create() {
    setPending(true);
    setError(null);
    const result = await createShareAction(entryId, Intl.DateTimeFormat().resolvedOptions().timeZone);
    if ("error" in result) setError(result.error);
    else setShare(result);
    setPending(false);
  }

  async function stop() {
    if (!confirm("Stop sharing? The link will stop working, for good.")) return;
    setPending(true);
    await stopSharingAction(entryId);
    setShare(null);
    setPending(false);
  }

  const box = "flex flex-col gap-3 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800";
  if (!share) {
    return (
      <section className={box} aria-label="Share">
        <p>Share this sunset with a link anyone can open, no account needed.</p>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <button
          type="button"
          disabled={pending}
          onClick={create}
          className="self-start rounded-lg bg-orange-600 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          Create a share link
        </button>
      </section>
    );
  }

  return (
    <section className={box} aria-label="Share">
      <p className="text-sm">Anyone with this link can see the photo, story, score and date. The exact location is never shared.</p>
      <input readOnly value={share.url} aria-label="Share link" onFocus={(e) => e.target.select()} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
      <div className="flex flex-wrap gap-3">
        {canShare && (
          <button
            type="button"
            onClick={() => navigator.share({ title: "A sunset on Sunset Soul", url: share.url }).catch(() => {})}
            className="rounded-lg bg-orange-600 px-4 py-2 font-medium text-white"
          >
            Share…
          </button>
        )}
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(share.url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      <form action={placeAction} className="flex flex-col gap-2">
        <label htmlFor="share-place" className="text-sm">
          Place name to show (optional)
        </label>
        <div className="flex gap-2">
          <input
            id="share-place"
            name="place"
            defaultValue={share.place ?? ""}
            maxLength={MAX_PLACE_LENGTH}
            placeholder="e.g. Ocean Beach, San Diego"
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button type="submit" disabled={placePending} className="rounded-lg border border-zinc-300 px-4 py-2 disabled:opacity-50 dark:border-zinc-700">
            Save
          </button>
        </div>
        {placeState?.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{placeState.error}</p>}
      </form>
      <button type="button" disabled={pending} onClick={stop} className="self-start text-sm text-red-700 underline disabled:opacity-50">
        Stop sharing
      </button>
    </section>
  );
}
