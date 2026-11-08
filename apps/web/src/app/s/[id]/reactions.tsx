"use client";

import { useState, type FormEvent } from "react";
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
    if (pending.action === "note") setNoteSent(true);
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

  const showNote = state.mine.length > 0 || state.note !== null;

  return (
    <section aria-label="Reactions" className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {REACTION_KINDS.map((kind) => {
          const selected = state.mine.includes(kind);
          return (
            <button
              key={kind}
              type="button"
              aria-pressed={selected}
              disabled={busy}
              onClick={() => tap(kind)}
              className={`flex min-h-12 items-center gap-2 rounded-full border px-5 text-lg disabled:opacity-60 ${
                selected
                  ? "border-[#F2B08E] bg-[#FBD2BC] text-[#1D2B5C]"
                  : "border-zinc-400 bg-transparent"
              }`}
            >
              <span>{REACTION_LABELS[kind]}</span>
              <span className="tabular-nums" aria-label={`${state.counts[kind]} so far`}>
                {state.counts[kind]}
              </span>
            </button>
          );
        })}
      </div>

      {askingName && (
        <form onSubmit={submitName} className="flex flex-col gap-2 rounded-2xl border border-zinc-300 p-4 dark:border-zinc-700">
          <label htmlFor="visitor-name" className="text-lg">
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
              className="min-h-12 min-w-0 flex-1 rounded-lg border border-zinc-400 px-3 text-lg dark:bg-zinc-900"
            />
            <button type="submit" disabled={busy || !name.trim()} className="min-h-12 rounded-lg bg-[#2C4A8C] px-5 text-lg text-white disabled:opacity-60">
              Continue
            </button>
          </div>
        </form>
      )}

      {showNote && !askingName && (
        <form onSubmit={submitNote} className="flex flex-col gap-2">
          <label htmlFor="reaction-note" className="text-lg">
            Add a note for {ownerName ?? "them"} (optional)
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
              placeholder="Best night of the whole trip"
              className="min-h-12 min-w-0 flex-1 rounded-lg border border-zinc-400 px-3 text-lg dark:bg-zinc-900"
            />
            <button
              type="submit"
              disabled={busy || noteSent}
              className="min-h-12 rounded-lg bg-[#2C4A8C] px-5 text-lg text-white disabled:opacity-60"
            >
              {noteSent ? "Sent" : "Send"}
            </button>
          </div>
          <p className="text-base text-zinc-600 dark:text-zinc-400">
            Only {ownerName ?? "the person who shared this"} sees your name and note. Others see the counts.
          </p>
        </form>
      )}

      {error && (
        <p role="alert" className="text-lg">
          {error}
        </p>
      )}
    </section>
  );
}
