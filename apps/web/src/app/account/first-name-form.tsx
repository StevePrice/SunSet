"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/button";
import { fieldClass, noticeClass } from "@/components/styles";
import { MAX_FIRST_NAME_LENGTH } from "@/lib/first-name";
import { saveFirstNameAction } from "./actions";

/** You: the first name friends see. The Save button appears only once the name has changed. */
export function FirstNameForm({ initial }: { initial: string }) {
  const [saved, setSaved] = useState(initial);
  const [name, setName] = useState(initial);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const changed = name.trim() !== saved;

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await saveFirstNameAction(name);
      if ("error" in result) {
        setMessage({ text: result.error, error: true });
      } else {
        setSaved(result.name);
        setName(result.name);
        setMessage({ text: "Saved.", error: false });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <label htmlFor="first-name" className="text-label font-bold">
        First name
      </label>
      <input
        id="first-name"
        className={fieldClass}
        autoComplete="given-name"
        maxLength={MAX_FIRST_NAME_LENGTH}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setMessage(null);
        }}
        aria-describedby="first-name-hint"
      />
      <p id="first-name-hint" className="text-caption text-ink-muted">
        Friends see this when you share a sunset.
      </p>
      {changed && (
        <Button type="submit" variant="action" className="mt-2 w-full" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      )}
      {message &&
        (message.error ? (
          <p role="alert" className={noticeClass}>
            {message.text}
          </p>
        ) : (
          <p role="status" className="text-caption text-ink-muted">
            {message.text}
          </p>
        ))}
    </form>
  );
}
