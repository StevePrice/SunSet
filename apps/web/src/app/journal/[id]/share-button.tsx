"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createShareAction } from "../actions";
import type { ShareChoice } from "@/lib/shares";
import { Button, type ButtonVariant } from "@/components/button";
import { noticeClass } from "@/components/styles";

// The Share button (Phase 4e, Build Spec 3.10) on Entry Detail ("Share") and Afterglow ("Share
// again"): one tap creates the link if there isn't one, then opens the phone's share menu with the
// link and the Stories card. No panel first; the link settings are in Afterglow.
//
// iOS only opens the share menu straight from a tap, not after waiting on the server, so:
// - the Stories image is fetched as soon as there's a link (not inside the tap), and
// - when the link is created inside the tap, the menu may be refused; then the button asks for one
//   more tap ("Tap again to share"), when everything is ready.
// Without a share menu (most computers) the button copies the link instead.
// Direct Instagram, Snapchat, TikTok and Facebook buttons need a native app (roadmap, Phase 9).
const SHARE_TITLE = "A sunset on Sunset Soul";
const SHARE_TEXT = "A sunset I wanted to share with you";

type Status = { kind: "idle" } | { kind: "working" } | { kind: "again" } | { kind: "copied" } | { kind: "error"; message: string };

export function ShareButton({
  entryId,
  initialUrl,
  label = "Share",
  variant = "action",
  choice,
  icon,
}: {
  entryId: string;
  initialUrl: string | null;
  label?: string;
  variant?: ButtonVariant;
  /** From Before you share (4f-3): who it's for and whether it includes the voice. */
  choice?: ShareChoice;
  icon?: ReactNode;
}) {
  const router = useRouter();
  // With a choice, the link depends on it (a personal link, the voice switch), so it's made on the
  // tap and kept for that choice only. The Stories card is the same for every link to the sunset.
  const choiceKey = choice ? JSON.stringify(choice) : "";
  const [made, setMade] = useState<{ key: string; url: string } | null>(choice ? null : initialUrl ? { key: "", url: initialUrl } : null);
  const url = made?.key === choiceKey ? made.url : null;
  const imageSource = url ?? initialUrl;
  const [image, setImage] = useState<{ url: string; file: File | null } | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const canShare = useBrowserCheck(() => typeof navigator.share === "function");

  // Fetch the Stories card ahead of the tap, once there's a link and the browser can share files.
  useEffect(() => {
    if (!imageSource || !canShare) return;
    const path = new URL(imageSource).pathname;
    if (image?.url === path) return;
    let live = true;
    loadStoriesImage(path).then((file) => live && setImage({ url: path, file }));
    return () => {
      live = false;
    };
  }, [imageSource, canShare, image?.url]);

  async function share() {
    setStatus({ kind: "working" });
    let link = url;
    let created = false;
    if (!link) {
      const result = await createShareAction(entryId, Intl.DateTimeFormat().resolvedOptions().timeZone, choice);
      if ("error" in result) return setStatus({ kind: "error", message: result.error });
      link = result.url;
      created = true;
      setMade({ key: choiceKey, url: link });
    }

    if (!canShare) {
      await navigator.clipboard.writeText(link).catch(() => {});
      setStatus({ kind: "copied" });
      if (created) router.refresh();
      return;
    }

    const file = image?.url === new URL(link).pathname ? image.file : null;
    const data: ShareData = file
      ? { files: [file], title: SHARE_TITLE, text: `${SHARE_TEXT}: ${link}` }
      : { title: SHARE_TITLE, text: SHARE_TEXT, url: link };
    try {
      await navigator.share(data);
      setStatus({ kind: "idle" });
    } catch (error) {
      // NotAllowedError: the tap "expired" while the link was being made. AbortError: closed the menu.
      setStatus(error instanceof DOMException && error.name === "NotAllowedError" ? { kind: "again" } : { kind: "idle" });
    }
    if (created) router.refresh();
  }

  const text =
    status.kind === "working" ? "Getting it ready…" : status.kind === "again" ? "Tap again to share" : label;
  return (
    <div className="flex flex-col gap-2">
      <Button variant={variant} className="w-full" disabled={status.kind === "working"} onClick={share} aria-live="polite">
        <span className="inline-flex items-center justify-center gap-2">
          {status.kind === "idle" && icon}
          {text}
        </span>
      </Button>
      {status.kind === "copied" && (
        <p role="status" className="text-caption text-ink-muted">
          Link copied. Paste it into a message or email.
        </p>
      )}
      {status.kind === "error" && (
        <p role="alert" className={noticeClass}>
          {status.message}
        </p>
      )}
    </div>
  );
}

/** The Stories card as a file to share, or null if it can't be fetched or shared. */
async function loadStoriesImage(path: string): Promise<File | null> {
  // Same-origin path, so it also works where BETTER_AUTH_URL differs from the page's origin.
  const blob = await fetch(`${path}/stories`)
    .then((r) => (r.ok ? r.blob() : null))
    .catch(() => null);
  if (!blob) return null;
  // A JPEG, or a PNG if the server couldn't encode one.
  const type = blob.type === "image/png" ? "image/png" : "image/jpeg";
  const file = new File([blob], `sunset-soul-story.${type === "image/png" ? "png" : "jpg"}`, { type });
  return typeof navigator.canShare === "function" && navigator.canShare({ files: [file] }) ? file : null;
}

const noSubscribe = () => () => {};

/** A yes/no fact about the browser; false while rendering on the server. */
function useBrowserCheck(check: () => boolean): boolean {
  return useSyncExternalStore(noSubscribe, check, () => false);
}
