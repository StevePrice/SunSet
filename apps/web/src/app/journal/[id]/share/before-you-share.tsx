"use client";

import { useState } from "react";
import { MicIcon } from "@/app/journal/[id]/story/voice-recorder";
import { Switch } from "@/components/switch";
import { joinNames } from "@/lib/people-input";
import { formatDuration } from "@/lib/story/voice";
import { ShareButton } from "../share-button";

const SOMEONE_ELSE = "";

/**
 * Who the link is for (only when the photo has names) and Include my voice (only when the story
 * was spoken, off by default). Share makes the link, personal or normal, and opens the share menu.
 */
export function BeforeYouShareForm({
  entryId,
  ownerName,
  names,
  voiceMs,
  shareUrl,
}: {
  entryId: string;
  ownerName: string | null;
  names: string[];
  /** Total length of the recordings; 0 when the story wasn't spoken. */
  voiceMs: number;
  /** The normal link, if the sunset is shared already (to get the Stories card ready). */
  shareUrl: string | null;
}) {
  // The first named person is picked to start (Build Spec 2.7).
  const [recipient, setRecipient] = useState(names[0] ?? SOMEONE_ELSE);
  const [includeVoice, setIncludeVoice] = useState(false);
  const owner = ownerName ?? "Someone";
  const listener = recipient || "them";

  return (
    <div className="flex flex-col gap-6">
      {names.length > 0 && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 flex flex-col gap-1">
            <span className="font-serif text-title-3">Who are you sending this to?</span>
            <span className="block">
              {names.length === 1
                ? `${names[0]} is in this photo. Pick ${names[0]} and the link will greet ${names[0]} by name.`
                : `${joinNames(names)} are in this photo. Pick who you're sending it to and the link will greet them by name.`}
            </span>
          </legend>
          {[...names, SOMEONE_ELSE].map((name) => {
            const selected = recipient === name;
            return (
              <label
                key={name || "someone-else"}
                className={`flex min-h-16 cursor-pointer items-center gap-4 rounded-ss-lg border-[1.5px] bg-surface-raised px-4 py-3 ${
                  selected ? "border-ink" : "border-border-subtle"
                }`}
              >
                <input
                  type="radio"
                  name="recipient"
                  checked={selected}
                  onChange={() => setRecipient(name)}
                  className="size-6 shrink-0 accent-[var(--color-ink)]"
                />
                <span className="flex flex-col">
                  <span className="text-label font-bold">{name || "Someone else"}</span>
                  <span className="text-caption text-ink-muted">
                    &ldquo;{name ? `${name}, you're in ${owner}'s sunset` : `${owner} shared a sunset with you`}&rdquo;
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
      )}

      {voiceMs > 0 && (
        <div className="flex flex-col gap-2 rounded-ss-lg bg-surface-raised p-5">
          <div className="flex items-center justify-between gap-4">
            <span id="voice-label" className="flex items-center gap-3 text-label font-bold">
              <MicIcon />
              Include my voice
            </span>
            <Switch checked={includeVoice} onChange={setIncludeVoice} labelledBy="voice-label" describedBy="voice-help" />
          </div>
          <p id="voice-help" className="text-caption text-ink-muted">
            Let {listener} hear you tell this story ({formatDuration(voiceMs)}). Off unless you turn it on.
          </p>
        </div>
      )}

      <ShareButton
        entryId={entryId}
        initialUrl={shareUrl}
        choice={{ recipient: recipient || null, includeVoice: voiceMs > 0 && includeVoice }}
        icon={<ShareIcon />}
      />
      <p className="text-caption text-ink-muted">
        Next, your phone&apos;s share menu opens. This step only appears when a photo has names or a spoken story.
      </p>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg aria-hidden width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15V3M7.5 7.5 12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}
