"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/button";
import { ReactionChip } from "@/components/reaction-chip";
import { fieldClass, noticeClass } from "@/components/styles";
import type { MyAddition } from "@/lib/addition-input";
import {
  MAX_NOTE_LENGTH,
  MAX_VISITOR_NAME_LENGTH,
  REACTION_KINDS,
  reactionLabel,
  type PublicReactions,
  type ReactionKind,
} from "@/lib/reaction-input";
import { AddToStory, type AdditionDraft } from "./add-to-story";

const OFFLINE = "Couldn't reach Sunset Soul. Check your connection and try again.";

/** "Sent! Louise will see your reaction and what you added to the story." */
export function sentMessage(owner: string, sent: { reacted: boolean; noted: boolean; added: boolean }): string {
  const parts: string[] = [];
  if (sent.reacted) parts.push("your reaction");
  if (sent.noted) parts.push(sent.reacted ? "note" : "your note");
  if (sent.added) parts.push("what you added to the story");
  if (!parts.length) return "Sent!";
  const last = parts.pop()!;
  return `Sent! ${owner} will see ${parts.length ? `${parts.join(", ")} and ${last}` : last}.`;
}

function draftFrom(addition: MyAddition | null): AdditionDraft {
  if (!addition) return { mode: "type", text: "", clip: null, heard: false };
  return {
    mode: addition.spoken ? "say" : "type",
    text: addition.text ?? "",
    clip: addition.spoken ? { durationMs: addition.durationMs ?? 0, url: null } : null,
    heard: false,
  };
}

// The friend's side of a Share Page (PRD 6.9a and 6.10e): the four reactions (each saved as it's
// tapped), a short note, and Add to the story, with one Send for the note and what they added.
// The first name is asked for once, the first time it's needed; a personal link already knows it.
// On a set page (4f-5) it's one reply for the whole set: reactions and a note, no Add to the story.
export function Reactions({
  shareId,
  initial,
  initialAddition,
  ownerName,
  recipientToken = null,
  set = false,
}: {
  shareId: string;
  initial: PublicReactions;
  initialAddition: MyAddition | null;
  ownerName: string | null;
  /** A personal link (4f-3): the person's name is known, and they were there. */
  recipientToken?: string | null;
  /** A set page (4f-5): `shareId` is the set's id, and it's always for the named person. */
  set?: boolean;
}) {
  const [state, setState] = useState(initial);
  // What to do once the friend has given their first name.
  const [askingName, setAskingName] = useState<null | (() => void)>(null);
  const [nameInput, setNameInput] = useState("");
  // The name given on this page, before the server has it (read by callbacks, so also a ref).
  const givenName = useRef<string | null>(null);
  const [shownName, setShownName] = useState<string | null>(null);
  const [note, setNote] = useState(initial.note ?? "");
  const [draft, setDraft] = useState<AdditionDraft>(() => draftFrom(initialAddition));
  const [addition, setAddition] = useState(initialAddition);
  // The note and Add to the story fold into one "Sent!" line once sent, with Change to reopen them.
  const [sent, setSent] = useState(initial.note !== null || Boolean(initialAddition?.sent));
  const [lastSent, setLastSent] = useState({ reacted: initial.mine.length > 0, noted: initial.note !== null, added: Boolean(initialAddition?.sent) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The reaction just turned on plays its icon animation once.
  const [justTapped, setJustTapped] = useState<ReactionKind | null>(null);

  const who = ownerName ?? "them";
  const owner = ownerName ?? "They";
  const knownName = state.name ?? shownName;

  const identity = useCallback(
    (): Record<string, string> => ({
      ...(givenName.current && { name: givenName.current }),
      ...(recipientToken && { recipient: recipientToken }),
    }),
    [recipientToken],
  );

  /** Runs `then` now if the friend's name is known; otherwise asks for it first. */
  const ensureName = useCallback(
    (then: () => void) => {
      if (state.name || givenName.current) then();
      else setAskingName(() => then);
    },
    [state.name],
  );

  async function post(path: string, body: object): Promise<{ ok: boolean; body: Record<string, unknown> } | null> {
    const response = await fetch(`/s/${set ? "set/" : ""}${shareId}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, ...identity() }),
    }).catch(() => null);
    if (!response) return null;
    return { ok: response.ok, body: (await response.json().catch(() => ({}))) as Record<string, unknown> };
  }

  async function toggle(kind: ReactionKind) {
    setBusy(true);
    setError(null);
    const result = await post("reactions", { action: "toggle", kind });
    setBusy(false);
    if (!result) return setError(OFFLINE);
    if (!result.ok) return setError((result.body.error as string) ?? "That didn't work. Please try again.");
    setState(result.body as unknown as PublicReactions);
  }

  function tap(kind: ReactionKind) {
    setJustTapped(state.mine.includes(kind) ? null : kind);
    ensureName(() => void toggle(kind));
  }

  function submitName(event: FormEvent) {
    event.preventDefault();
    const name = nameInput.trim();
    if (!name || !askingName) return;
    givenName.current = name;
    setShownName(name);
    const then = askingName;
    setAskingName(null);
    then();
  }

  const spoken = draft.mode === "say" && draft.clip !== null;
  const additionText = draft.text.trim();
  const noteChanged = note.trim() !== (state.note ?? "");
  // Something to send: a new or changed addition, or one being cleared.
  const additionChanged =
    spoken || additionText !== "" ? !addition?.sent || additionText !== (addition.text ?? "") || spoken !== addition.spoken : addition !== null;

  async function sendAll() {
    setBusy(true);
    setError(null);
    let noted = state.note !== null;
    if (noteChanged) {
      const result = await post("reactions", { action: "note", note });
      if (!result || !result.ok) {
        setBusy(false);
        return setError(result ? ((result.body.error as string) ?? "That didn't work. Please try again.") : OFFLINE);
      }
      const reactions = result.body as unknown as PublicReactions;
      setState(reactions);
      setNote(reactions.note ?? "");
      noted = reactions.note !== null;
    }
    let added = Boolean(addition?.sent);
    if (additionChanged) {
      const result = await post("additions", { text: draft.text, spoken });
      if (!result || !result.ok) {
        setBusy(false);
        // The words and recording stay on the page, so nothing is lost.
        return setError(result ? ((result.body.error as string) ?? "Couldn't send. Try again.") : "Couldn't send. Try again.");
      }
      const saved = (result.body.addition as MyAddition | null) ?? null;
      setAddition(saved);
      if (!saved) setDraft(draftFrom(null));
      else if (!saved.spoken) setDraft((d) => ({ ...d, clip: null, heard: false }));
      added = Boolean(saved?.sent);
    }
    setBusy(false);
    setSent(true);
    setLastSent({ reacted: state.mine.length > 0, noted, added });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!noteChanged && !additionChanged) {
      // Nothing new: just fold the boxes away again if something was sent before.
      if (state.note !== null || addition?.sent || state.mine.length > 0) {
        setLastSent({ reacted: state.mine.length > 0, noted: state.note !== null, added: Boolean(addition?.sent) });
        setSent(true);
      } else {
        setError(set ? "Tap a reaction or write a note first." : "Tap a reaction, write a note, or add to the story first.");
      }
      return;
    }
    ensureName(() => void sendAll());
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="reactions-heading" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="reactions-heading" className="font-serif text-title-3">
            Let {who} know you saw {set ? "them" : "it"}
          </h2>
          <p className="text-ink-muted">{set ? "One reply for the whole set. Tap one or more." : "Tap one or more, and add a note if you like."}</p>
        </div>
        {/* Two rows of two (Build Spec 3.12). */}
        <div className="grid grid-cols-2 gap-3">
          {REACTION_KINDS.map((kind) => (
            <ReactionChip
              key={kind}
              kind={kind}
              label={reactionLabel(kind, set || recipientToken !== null)}
              count={state.counts[kind]}
              selected={state.mine.includes(kind)}
              animate={justTapped === kind && state.mine.includes(kind)}
              disabled={busy}
              onClick={() => tap(kind)}
            />
          ))}
        </div>
      </section>

      {askingName && (
        <form onSubmit={submitName} className="flex flex-col gap-2 rounded-ss-lg bg-surface-raised p-4">
          <label htmlFor="visitor-name">
            What&apos;s your first name? {ownerName ? `So ${ownerName} knows who it's from.` : "So they know who it's from."}
          </label>
          <div className="flex gap-2">
            <input
              id="visitor-name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={MAX_VISITOR_NAME_LENGTH}
              autoComplete="given-name"
              autoFocus
              required
              className={`${fieldClass} flex-1`}
            />
            <Button type="submit" variant="action" disabled={busy || !nameInput.trim()}>
              Continue
            </Button>
          </div>
        </form>
      )}

      {sent ? (
        <div className="flex flex-col items-start gap-1">
          <p role="status">{sentMessage(owner, lastSent)}</p>
          <button type="button" onClick={() => setSent(false)} className="inline-flex min-h-12 items-center text-label underline">
            Change
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="reaction-note" className="text-caption text-ink-muted">
              A short note to {who}
            </label>
            <input
              id="reaction-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={MAX_NOTE_LENGTH}
              placeholder={`Add a note for ${who} (optional)`}
              className={`${fieldClass} ss-story`}
            />
          </div>

          {!set && (
            <AddToStory
              shareId={shareId}
              ownerName={who}
              personal={recipientToken !== null}
              draft={draft}
              onChange={setDraft}
              ensureName={ensureName}
              recordFields={identity}
              disabled={busy}
            />
          )}

          <div className="flex flex-col gap-2">
            <Button type="submit" variant="action" disabled={busy} className="w-full">
              Send
            </Button>
            <p className="text-caption text-ink-muted">
              {knownName ? `Sending as ${knownName}. ` : ""}Only {ownerName ?? "the person who shared this"} sees {set ? "your note" : "your name, note and what you add"}.
            </p>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className={noticeClass}>
          {error}
        </p>
      )}
    </div>
  );
}
