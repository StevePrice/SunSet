"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/button";
import { panelClass } from "@/components/styles";
import { deleteSetReplyAction, stopSetAction } from "../actions";

/** The live set's link (4f-5): what it shows, Copy link and Stop sharing. */
export function SetLinkPanel({ personName, setId, url, count, voice }: { personName: string; setId: string; url: string; count: number; voice: boolean }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [stopping, setStopping] = useState(false);

  async function stop() {
    if (!confirm(`Stop sharing? ${personName}'s link will stop working, for good. You keep any replies here.`)) return;
    setStopping(true);
    await stopSetAction(personName, setId);
    router.refresh();
  }

  return (
    <section className={panelClass} aria-labelledby="set-link">
      <h2 id="set-link" className="font-serif text-title-3">
        Shared with {personName}
      </h2>
      <p>
        {count === 1 ? "1 sunset" : `${count} sunsets`} in one link. Anyone with it can see the photos, titles, stories and dates, and reply.
        The exact locations are never shared{voice ? ". Your voice is included where you told the story out loud." : ", and your voice isn't included."}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={async () => {
            await navigator.clipboard.writeText(url).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "Copied" : "Copy link"}
        </Button>
        <Button onClick={stop} disabled={stopping}>
          Stop sharing
        </Button>
      </div>
    </section>
  );
}

/** Remove, on a friend's reaction or note to a set, after a confirm. */
export function RemoveSetReply({ personName, target, label }: { personName: string; target: { reactionId: string } | { noteId: string }; label: string }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={label}
      className="min-h-12 px-2 text-label text-ink-muted underline disabled:opacity-50"
      onClick={async () => {
        if (!confirm(`${label}? This can't be undone.`)) return;
        setPending(true);
        await deleteSetReplyAction(personName, target);
        setPending(false);
      }}
    >
      Remove
    </button>
  );
}
