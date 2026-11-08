"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { createShareAction, stopSharingAction, updateSharePlaceAction, type ShareLink } from "../actions";
import { MAX_PLACE_LENGTH } from "@/lib/shares";

// Creating the link is a separate tap from opening the share sheet: iOS only opens the sheet
// straight from a tap, not after waiting on the server. For the same reason the Stories image
// can't be fetched inside the tap that shares it. It's a large PNG, so it isn't downloaded on
// every visit either: the first tap on More fetches it ("Preparing image…"), and the next tap
// opens the share sheet with it attached.
//
// Messages (phones only) opens the text app with the link. More opens the share sheet with the
// Stories image when the browser can share files, or just the link when it can't.
// Direct Instagram, Snapchat, TikTok and Facebook buttons need a native app (roadmap, Phase 4b).
const SHARE_TITLE = "A sunset on Sunset Soul";
const SHARE_TEXT = "A sunset I wanted to share with you";
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

  const [stories, setStories] = useState<StoriesImage>({ status: "idle" });

  // The share sheet and the pointer type only exist in the browser; the server renders without them.
  const canShare = useBrowserCheck(() => typeof navigator.share === "function");
  const canShareFiles = useBrowserCheck(
    () => typeof navigator.canShare === "function" && navigator.canShare({ files: [new File([""], "x.png", { type: "image/png" })] }),
  );
  const isPhone = useBrowserCheck(() => window.matchMedia("(pointer: coarse)").matches);

  async function create() {
    setPending(true);
    setError(null);
    const result = await createShareAction(entryId, Intl.DateTimeFormat().resolvedOptions().timeZone);
    if ("error" in result) setError(result.error);
    else setShare(result);
    setPending(false);
  }

  async function loadStories(url: string) {
    setStories({ status: "loading", url });
    // Same-origin path, so it also works where BETTER_AUTH_URL differs from the page's origin.
    const blob = await fetch(`${new URL(url).pathname}/stories`)
      .then((r) => (r.ok ? r.blob() : null))
      .catch(() => null);
    const file = blob && new File([blob], "sunset-soul-story.png", { type: "image/png" });
    setStories(file && navigator.canShare({ files: [file] }) ? { status: "ready", url, file } : { status: "failed", url });
  }

  async function shareMore(url: string) {
    const current = stories.status !== "idle" && stories.url === url ? stories : null;
    if (canShareFiles && !current) return loadStories(url);
    if (current?.status === "loading") return;
    const data: ShareData =
      current?.status === "ready"
        ? { files: [current.file], title: SHARE_TITLE, text: `${SHARE_TEXT}: ${url}` }
        : { title: SHARE_TITLE, text: SHARE_TEXT, url };
    await navigator.share(data).catch(() => {});
  }

  const storiesStatus = stories.status !== "idle" && stories.url === share?.url ? stories.status : "idle";

  async function stop() {
    if (!confirm("Stop sharing? The link will stop working, for good, and friends can no longer react. You keep their reactions in Afterglow.")) return;
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
      <p className="text-sm">Anyone with this link can see the photo, story, score and date, and react to it. The exact location is never shared.</p>
      <input readOnly value={share.url} aria-label="Share link" onFocus={(e) => e.target.select()} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
      <div className="flex flex-wrap gap-3">
        {isPhone && (
          <a
            href={`sms:?&body=${encodeURIComponent(`${SHARE_TEXT}: ${share.url}`)}`}
            className="flex min-h-12 items-center rounded-lg bg-orange-600 px-4 py-2 font-medium text-white"
          >
            Messages
          </a>
        )}
        {canShare && (
          <button
            type="button"
            disabled={storiesStatus === "loading"}
            aria-live="polite"
            onClick={() => shareMore(share.url)}
            className="min-h-12 rounded-lg border border-zinc-300 px-4 py-2 disabled:opacity-60 dark:border-zinc-700"
          >
            {storiesStatus === "loading" ? "Preparing image…" : storiesStatus === "ready" ? "Share image…" : "More…"}
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

type StoriesImage =
  | { status: "idle" }
  | { status: "loading" | "failed"; url: string }
  | { status: "ready"; url: string; file: File };

const noSubscribe = () => () => {};

/** A yes/no fact about the browser; false while rendering on the server. */
function useBrowserCheck(check: () => boolean): boolean {
  return useSyncExternalStore(noSubscribe, check, () => false);
}
