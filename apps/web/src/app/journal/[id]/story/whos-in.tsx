"use client";

import { useState } from "react";
import { NameToggle, PeopleIcon } from "@/components/people";
import { MAX_NAME_LENGTH, parseName } from "@/lib/people-input";

/**
 * "Who's in this one?" (Build Spec 2.1, picture 17): under the story box, only when the people
 * check says yes (or names were added before). Optional; never blocks Save. Names used before
 * come first as chips, most recent first; a new name becomes a picked chip.
 */
export function WhosIn({
  known,
  picked,
  onChange,
  detected,
}: {
  /** Names this person has used before, most recent first. */
  known: string[];
  picked: string[];
  onChange: (names: string[]) => void;
  /** The people check said yes (otherwise the person opened this from Edit). */
  detected: boolean;
}) {
  const [typed, setTyped] = useState("");
  // Names added here this time, shown as chips with the known ones.
  const [added, setAdded] = useState<string[]>([]);
  const lower = (names: string[]) => names.map((n) => n.toLowerCase());
  const chips = [...added, ...picked.filter((n) => !lower(added).includes(n.toLowerCase())), ...known].filter(
    (name, i, all) => lower(all).indexOf(name.toLowerCase()) === i,
  );
  const isPicked = (name: string) => lower(picked).includes(name.toLowerCase());

  function toggle(name: string) {
    onChange(isPicked(name) ? picked.filter((n) => n.toLowerCase() !== name.toLowerCase()) : [...picked, name]);
  }

  function add() {
    const name = parseName(typed);
    if (!name) return;
    const existing = chips.find((n) => n.toLowerCase() === name.toLowerCase());
    if (!existing) setAdded((a) => [name, ...a]);
    if (!isPicked(existing ?? name)) onChange([...picked, existing ?? name]);
    setTyped("");
  }

  return (
    <section aria-labelledby="whos-in" className="flex flex-col gap-4 rounded-ss-lg bg-surface-raised p-5">
      <h2 id="whos-in" className="flex items-center gap-3 font-serif text-title-3">
        <PeopleIcon size={24} />
        Who&apos;s in this one?
      </h2>
      <p>
        {detected ? "It looks like there are people in this photo. " : ""}
        {detected ? "Add their names if you like." : "Add the names of anyone in this photo if you like."} Only you see them.
      </p>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {chips.map((name) => (
            <NameToggle key={name.toLowerCase()} name={name} selected={isPicked(name)} onClick={() => toggle(name)} />
          ))}
        </div>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <label htmlFor="add-name" className="sr-only">
          Add a name
        </label>
        <input
          id="add-name"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          maxLength={MAX_NAME_LENGTH}
          placeholder="Add a name"
          autoComplete="off"
          enterKeyHint="done"
          className="min-h-12 min-w-0 flex-1 rounded-ss-md border border-border-subtle bg-surface px-3 py-2 text-ink placeholder:text-ink-muted"
        />
        <button
          type="submit"
          aria-label="Add this name"
          className="flex size-12 shrink-0 items-center justify-center self-center rounded-ss-md border-[1.5px] border-border-subtle text-ink"
        >
          <svg aria-hidden width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </form>
      <p className="text-caption text-ink-muted">Names you&apos;ve used before appear here, so you can tap instead of typing.</p>
    </section>
  );
}
