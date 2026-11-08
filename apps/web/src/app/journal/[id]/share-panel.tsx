"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { createShareAction, stopSharingAction, updateSharePlaceAction, type ShareLink } from "../actions";
import { Button, ButtonAnchor } from "@/components/button";
import { fieldClass, noticeClass, panelClass } from "@/components/styles";
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
    () => typeof navigator.canShare === "function" && navigator.canShare({ files: [new File([""], "x.jpg", { type: "image/jpeg" })] }),
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
    // A JPEG, or a PNG if the server couldn't encode one.
    const type = blob?.type === "image/png" ? "image/png" : "image/jpeg";
    const file = blob && new File([blob], `sunset-soul-story.${type === "image/png" ? "png" : "jpg"}`, { type });
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
        {isPhone && (
          <ButtonAnchor variant="action" href={`sms:?&body=${encodeURIComponent(`${SHARE_TEXT}: ${share.url}`)}`}>
            Messages
          </ButtonAnchor>
        )}
        {canShare && (
          // The panel's one action button is Messages on phones, More elsewhere.
          <Button
            variant={isPhone ? "secondary" : "action"}
            disabled={storiesStatus === "loading"}
            aria-live="polite"
            onClick={() => shareMore(share.url)}
          >
            {storiesStatus === "loading" ? "Preparing image…" : storiesStatus === "ready" ? "Share image…" : "More…"}
          </Button>
        )}
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

type StoriesImage =
  | { status: "idle" }
  | { status: "loading" | "failed"; url: string }
  | { status: "ready"; url: string; file: File };

const noSubscribe = () => () => {};

/** A yes/no fact about the browser; false while rendering on the server. */
function useBrowserCheck(check: () => boolean): boolean {
  return useSyncExternalStore(noSubscribe, check, () => false);
}
