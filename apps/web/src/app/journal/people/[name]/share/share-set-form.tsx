"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { MicIcon } from "@/app/journal/[id]/story/voice-recorder";
import { Button } from "@/components/button";
import { LocalDate } from "@/components/local-date";
import { peopleHref } from "@/components/people";
import { PhotoCard } from "@/components/photo-card";
import { ShareIcon } from "@/components/share-icon";
import { noticeClass } from "@/components/styles";
import { Switch } from "@/components/switch";
import { setGreeting } from "@/lib/share-set-input";
import { shareSetAction } from "../../actions";

type Sunset = { id: string; title: string | null; takenAt: string; timeZone: string | null; spoken: boolean };
type Status = { kind: "idle" } | { kind: "working" } | { kind: "again" } | { kind: "copied" } | { kind: "error"; message: string };

const sunsets = (n: number) => (n === 1 ? "1 sunset" : `${n} sunsets`);

/**
 * The review list (all checked to start), Include my voice (only when a story was spoken, off by
 * default), and Share N sunsets: makes the set's link, then opens the phone's share menu. Without a
 * share menu (most computers) the link is copied instead.
 */
export function ShareSetForm({
  personName,
  ownerName,
  sunsets: list,
  initialVoice,
  sharingAgain,
}: {
  personName: string;
  ownerName: string | null;
  sunsets: Sunset[];
  initialVoice: boolean;
  /** The person already has a live set: sharing again changes it, and the link stays the same. */
  sharingAgain: boolean;
}) {
  const router = useRouter();
  const [unchecked, setUnchecked] = useState<Set<string>>(new Set());
  const [includeVoice, setIncludeVoice] = useState(initialVoice);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // The link made for this exact choice, so "Tap again to share" doesn't make it twice.
  const [made, setMade] = useState<{ key: string; url: string } | null>(null);
  const canShare = useSyncExternalStore(
    () => () => {},
    () => typeof navigator.share === "function",
    () => false,
  );

  const chosen = list.filter((s) => !unchecked.has(s.id));
  const anySpoken = list.some((s) => s.spoken);
  const voice = anySpoken && includeVoice && chosen.some((s) => s.spoken);
  const key = JSON.stringify([chosen.map((s) => s.id), voice]);
  const greeting = setGreeting(personName, ownerName ?? "Someone", chosen.length);

  function toggle(id: string) {
    setUnchecked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function share() {
    setStatus({ kind: "working" });
    let url = made?.key === key ? made.url : null;
    if (!url) {
      const result = await shareSetAction({
        personName,
        entryIds: chosen.map((s) => s.id),
        total: list.length,
        includeVoice: voice,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      if ("error" in result) return setStatus({ kind: "error", message: result.error });
      url = result.url;
      setMade({ key, url });
    }
    if (!canShare) {
      await navigator.clipboard.writeText(url).catch(() => {});
      return setStatus({ kind: "copied" });
    }
    try {
      await navigator.share({ title: "Our sunsets together", text: greeting, url });
      router.push(peopleHref(personName));
    } catch (error) {
      // NotAllowedError: the tap "expired" while the link was being made. AbortError: closed the menu.
      setStatus(error instanceof DOMException && error.name === "NotAllowedError" ? { kind: "again" } : { kind: "idle" });
    }
  }

  const label =
    status.kind === "working" ? "Getting it ready…" : status.kind === "again" ? "Tap again to share" : `Share ${sunsets(chosen.length)}`;

  return (
    <div className="flex flex-col gap-6">
      <ul aria-label="Sunsets to send" className="flex flex-col divide-y divide-divider border-y border-divider">
        {list.map((sunset) => {
          const checked = !unchecked.has(sunset.id);
          return (
            <li key={sunset.id}>
              <label className="flex min-h-20 cursor-pointer items-center gap-4 py-3">
                <PhotoCard src={`/api/photos/${sunset.id}/thumb`} alt="" square corners="sm" className="w-16 shrink-0" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-serif text-title-3">{sunset.title ?? "Untitled sunset"}</span>
                  <span className="text-caption text-ink-muted">
                    <LocalDate iso={sunset.takenAt} timeZone={sunset.timeZone} />
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(sunset.id)}
                  className="size-7 shrink-0 accent-[var(--color-ink)]"
                />
              </label>
            </li>
          );
        })}
      </ul>

      {anySpoken && (
        <div className="flex flex-col gap-2 rounded-ss-lg bg-surface-raised p-5">
          <div className="flex items-center justify-between gap-4">
            <span id="set-voice-label" className="flex items-center gap-3 text-label font-bold">
              <MicIcon />
              Include my voice
            </span>
            <Switch checked={includeVoice} onChange={setIncludeVoice} labelledBy="set-voice-label" describedBy="set-voice-help" />
          </div>
          <p id="set-voice-help" className="text-caption text-ink-muted">
            On sunsets where you told the story out loud. Off unless you turn it on.
          </p>
        </div>
      )}

      <p className="text-label font-bold" aria-live="polite">
        {chosen.length} of {list.length} selected
      </p>
      <Button variant="action" className="w-full" disabled={!chosen.length || status.kind === "working"} onClick={share} aria-live="polite">
        <span className="inline-flex items-center justify-center gap-2">
          {status.kind === "idle" && <ShareIcon />}
          {label}
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
      <p className="text-caption text-ink-muted">
        Next, your phone&apos;s share menu opens. {personName}&apos;s link says &ldquo;{greeting}.&rdquo;{" "}
        {sharingAgain ? `It's the same link as before, now with these sunsets. ` : ""}You can stop sharing any time.
      </p>
    </div>
  );
}
