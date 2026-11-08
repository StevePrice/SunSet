"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/button";
import { ReactionChip } from "@/components/reaction-chip";
import { fieldClass, noticeClass } from "@/components/styles";
import {
  MAX_NOTE_LENGTH,
  MAX_VISITOR_NAME_LENGTH,
  REACTION_KINDS,
  REACTION_LABELS,
  type PublicReactions,
  type ReactionKind,
} from "@/lib/reaction-input";

type Pending = { action: "toggle"; kind: ReactionKind } | { action: "note"; note: string };

// The reaction buttons on a Share Page (PRD 6.9a). Friends see counts only; the first tap asks
// for a first name once, then the browser remembers this visitor with a cookie.
export function Reactions({ shareId, initial, ownerName }: { shareId: string; initial: PublicReactions; ownerName: string | null }) {
  const [state, setState] = useState(initial);
  const [askingName, setAskingName] = useState<Pending | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState(initial.note ?? "");
  const [noteSent, setNoteSent] = useState(initial.note !== null);
  const [editingNote, setEditingNote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(pending: Pending, withName?: string) {
    setBusy(true);
    setError(null);
    const response = await fetch(`/s/${shareId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...pending, ...(withName && { name: withName }) }),
    }).catch(() => null);
    setBusy(false);
    if (!response) {
      setError("Couldn't reach Sunset Soul. Check your connection and try again.");
      return;
    }
    const body = (await response.json().catch(() => ({}))) as Partial<PublicReactions> & { error?: string; needName?: boolean };
    if (body.needName) {
      setAskingName(pending);
      return;
    }
    if (!response.ok) {
      setError(body.error ?? "That didn't work. Please try again.");
      return;
    }
    setAskingName(null);
    setState(body as PublicReactions);
    if (pending.action === "note") {
      setNoteSent(true);
      setEditingNote(false);
    }
  }

  function tap(kind: ReactionKind) {
    const pending: Pending = { action: "toggle", kind };
    if (!state.name) setAskingName(pending);
    else void send(pending);
  }

  function submitName(event: FormEvent) {
    event.preventDefault();
    if (askingName) void send(askingName, name);
  }

  function submitNote(event: FormEvent) {
    event.preventDefault();
    const pending: Pending = { action: "note", note };
    if (!state.name) setAskingName(pending);
    else void send(pending);
  }

  const who = ownerName ?? "them";
  const showNote = state.mine.length > 0 || state.note !== null;

  return (
    <section aria-labelledby="reactions-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="reactions-heading" className="font-serif text-title-3">
          How did this sunset make you feel?
        </h2>
        <p className="text-ink-muted">Tap a reaction to let {who} know.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {REACTION_KINDS.map((kind) => {
          return (
            <ReactionChip
              key={kind}
              label={REACTION_LABELS[kind]}
              count={state.counts[kind]}
              selected={state.mine.includes(kind)}
              disabled={busy}
              onClick={() => tap(kind)}
            />
          );
        })}
      </div>

      {askingName && (
        <form onSubmit={submitName} className="flex flex-col gap-2 rounded-ss-lg bg-surface-raised p-4">
          <label htmlFor="visitor-name">
            What&apos;s your first name? {ownerName ? `So ${ownerName} knows who reacted.` : "So they know who reacted."}
          </label>
          <div className="flex gap-2">
            <input
              id="visitor-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_VISITOR_NAME_LENGTH}
              autoComplete="given-name"
              autoFocus
              required
              className={`${fieldClass} flex-1`}
            />
            <Button type="submit" variant="action" disabled={busy || !name.trim()}>
              Continue
            </Button>
          </div>
        </form>
      )}

      {showNote && !askingName && noteSent && !editingNote && (
        <div className="flex flex-col items-start gap-1">
          <p role="status">Sent! {ownerName ?? "They"} will see your reaction.</p>
          <button
            type="button"
            onClick={() => setEditingNote(true)}
            className="inline-flex min-h-12 items-center text-label underline"
          >
            Edit your note
          </button>
        </div>
      )}

      {showNote && !askingName && !(noteSent && !editingNote) && (
        <form onSubmit={submitNote} className="flex flex-col gap-2">
          <label htmlFor="reaction-note" className="sr-only">
            Add a note for {who} (optional)
          </label>
          <div className="flex gap-2">
            <input
              id="reaction-note"
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setNoteSent(false);
              }}
              maxLength={MAX_NOTE_LENGTH}
              placeholder={`Add a note for ${who} (optional)`}
              className={`${fieldClass} ss-story flex-1`}
            />
            <Button type="submit" variant="action" disabled={busy}>
              Send
            </Button>
          </div>
          <p className="text-caption text-ink-muted">
            Only {ownerName ?? "the person who shared this"} sees your name and note. Others see the counts.
          </p>
        </form>
      )}

      {error && (
        <p role="alert" className={noticeClass}>
          {error}
        </p>
      )}
    </section>
  );
}
