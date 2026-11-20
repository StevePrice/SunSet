"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { stopSharingAction, updateSharePlaceAction, type ShareLink } from "../actions";
import { Button } from "@/components/button";
import { fieldClass, noticeClass, panelClass } from "@/components/styles";
import { MAX_PLACE_LENGTH } from "@/lib/shares";

type PlaceState = { error: string } | { saved: true } | null;

/**
 * Link settings in Afterglow (Phase 4e, Build Spec 3.11): what the link shows, Copy link, the place
 * name friends see, and Stop sharing. Only shown while the sunset is shared.
 */
export function LinkSettings({ entryId, share }: { entryId: string; share: ShareLink }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [placeState, placeAction, placePending] = useActionState<PlaceState, FormData>(
    async (_prev, form) => (await updateSharePlaceAction(entryId, null, form)) ?? { saved: true },
    null,
  );

  async function stop() {
    if (!confirm("Stop sharing? The link will stop working, for good, and friends can no longer react. You keep their reactions here.")) return;
    setStopping(true);
    await stopSharingAction(entryId);
    router.refresh();
  }

  return (
    <section className={panelClass} aria-labelledby="link-settings">
      <h2 id="link-settings" className="font-serif text-title-3">
        Link settings
      </h2>
      <p>Anyone with the link can see the photo, title, story and date, and react. The exact location is never shared.</p>
      <Button
        className="self-start"
        onClick={async () => {
          await navigator.clipboard.writeText(share.url).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? "Copied" : "Copy link"}
      </Button>
      <form action={placeAction} className="flex flex-col gap-2">
        <label htmlFor="share-place" className="text-label font-bold">
          Place name friends see
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
        {placeState && "error" in placeState && (
          <p role="alert" className={noticeClass}>
            {placeState.error}
          </p>
        )}
        {placeState && "saved" in placeState && (
          <p role="status" className="text-caption text-ink-muted">
            Saved.
          </p>
        )}
      </form>
      <button
        type="button"
        disabled={stopping}
        onClick={stop}
        className="inline-flex min-h-12 items-center self-start text-label underline disabled:opacity-50"
      >
        {stopping ? "Stopping…" : "Stop sharing"}
      </button>
    </section>
  );
}
