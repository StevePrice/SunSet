"use client";

import { useState, useTransition } from "react";
import { AiPrivacyText } from "@/components/ai-privacy";
import { buttonClass } from "@/components/button";
import { noticeClass } from "@/components/styles";
import { deleteAllRecordingsAction } from "../journal/actions";
import { setAiStoryHelpAction } from "./actions";

const plural = (n: number) => (n === 1 ? "1 recording" : `${n} recordings`);

export function SettingsPanel({ aiStoryHelp, recordings }: { aiStoryHelp: boolean; recordings: number }) {
  const [pending, startPending] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <section className="flex flex-col gap-5" aria-labelledby="settings-title">
      <h2 id="settings-title" className="font-serif text-title-2">
        Settings
      </h2>

      <div className="flex flex-col gap-2">
        <h3 className="text-label font-bold">AI story help</h3>
        <p className="text-ink-muted">
          {aiStoryHelp
            ? "On. After you save a sunset, I ask a few questions and help write its story. You can speak or type."
            : "Off. You write each story yourself, and nothing is sent to an AI service."}
        </p>
        <button
          type="button"
          disabled={pending}
          className={buttonClass("secondary", "w-full")}
          onClick={() => startPending(() => setAiStoryHelpAction(!aiStoryHelp))}
        >
          {aiStoryHelp ? "Turn off AI story help" : "Turn on AI story help"}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-label font-bold">Recordings</h3>
        <p className="text-ink-muted">
          {recordings === 0 ? "You have no recordings." : `You have ${plural(recordings)}.`} Deleting them keeps your stories and
          what you said.
        </p>
        {confirming ? (
          <div className={`${noticeClass} flex flex-col gap-3`}>
            <p>Delete all {plural(recordings)}? This can&apos;t be undone.</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={pending}
                className={buttonClass("secondary")}
                onClick={() =>
                  startPending(async () => {
                    const { deleted } = await deleteAllRecordingsAction();
                    setConfirming(false);
                    setMessage(deleted === 0 ? "There were no recordings to delete." : `Deleted ${plural(deleted)}.`);
                  })
                }
              >
                {pending ? "Deleting…" : "Yes, delete them"}
              </button>
              <button type="button" disabled={pending} className={buttonClass("secondary")} onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={pending || recordings === 0}
            className={buttonClass("secondary", "w-full")}
            onClick={() => {
              setMessage(null);
              setConfirming(true);
            }}
          >
            Delete all recordings
          </button>
        )}
        {message && (
          <p role="status" className={noticeClass}>
            {message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-label font-bold">Your data and privacy</h3>
        <AiPrivacyText />
      </div>
    </section>
  );
}
