"use client";

import { useActionState, useEffect, useState, useSyncExternalStore } from "react";
import { createShareAction, stopSharingAction, updateSharePlaceAction, type ShareLink } from "../actions";
import { Button, ButtonAnchor } from "@/components/button";
import { fieldClass, noticeClass, panelClass } from "@/components/styles";
import { MAX_PLACE_LENGTH } from "@/lib/shares";

// Creating the link is a separate tap from opening the share sheet: iOS only opens the sheet
// straight from a tap, not after waiting on the server. For the same reason the Stories image is
// fetched ahead of time, so "More" can attach it without waiting.
//
// Messages opens the phone's text app with the link. More opens the phone's share sheet with the
// Stories image attached when the browser can share files, or just the link when it can't.
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

  const storiesFile = useStoriesFile(share?.url ?? null);

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

  async function shareMore(url: string) {
    const withFile = storiesFile && navigator.canShare?.({ files: [storiesFile] });
    const data: ShareData = withFile
      ? { files: [storiesFile], title: SHARE_TITLE, text: `${SHARE_TEXT}: ${url}` }
      : { title: SHARE_TITLE, text: SHARE_TEXT, url };
    await navigator.share(data).catch(() => {});
  }

  async function stop() {
    if (!confirm("Stop sharing? The link will stop working, for good, and friends can no longer react. You keep their reactions in Afterglow.")) return;
    setPending(true);
    await stopSharingAction(entryId);
    setShare(null);
    setPending(false);
  }

  const box = panelClass;
  if (!share) {
    return (
      <section className={box} aria-label="Share">
        <p>Share this sunset with a link anyone can open, no account needed.</p>
        {error && <p role="alert" className={noticeClass}>{error}</p>}
        <Button variant="action" disabled={pending} onClick={create} className="self-start">
          Create a share link
        </Button>
      </section>
    );
  }

  return (
    <section className={box} aria-label="Share">
      <p>Anyone with this link can see the photo, story, score and date, and react to it. The exact location is never shared.</p>
      <input readOnly value={share.url} aria-label="Share link" onFocus={(e) => e.target.select()} className={`${fieldClass} text-caption`} />
      <div className="flex flex-wrap gap-3">
        <ButtonAnchor variant="action" href={`sms:?&body=${encodeURIComponent(`${SHARE_TEXT}: ${share.url}`)}`}>
          Messages
        </ButtonAnchor>
        {canShare && <Button onClick={() => shareMore(share.url)}>More…</Button>}
        <Button
          onClick={async () => {
            await navigator.clipboard.writeText(share.url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
      <form action={placeAction} className="flex flex-col gap-2">
        <label htmlFor="share-place">
          Place name to show (optional)
        </label>
        <div className="flex gap-2">
          <input
            id="share-place"
            name="place"
            defaultValue={share.place ?? ""}
            maxLength={MAX_PLACE_LENGTH}
            placeholder="e.g. Ocean Beach, San Diego"
            className={`${fieldClass} flex-1`}
          />
          <Button type="submit" disabled={placePending}>
            Save
          </Button>
        </div>
        {placeState?.error && <p role="alert" className={noticeClass}>{placeState.error}</p>}
      </form>
      <button type="button" disabled={pending} onClick={stop} className="inline-flex min-h-12 items-center self-start text-label underline disabled:opacity-50">
        Stop sharing
      </button>
    </section>
  );
}

/** The share's Stories card as a File, fetched ahead of the tap that shares it. */
function useStoriesFile(url: string | null): File | null {
  const [file, setFile] = useState<{ url: string; file: File } | null>(null);
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    // Same-origin path, so it also works where BETTER_AUTH_URL differs from the page's origin.
    fetch(`${new URL(url).pathname}/stories`)
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (blob && !cancelled) setFile({ url, file: new File([blob], "sunset-soul-story.png", { type: "image/png" }) });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [url]);
  return file && file.url === url ? file.file : null;
}
