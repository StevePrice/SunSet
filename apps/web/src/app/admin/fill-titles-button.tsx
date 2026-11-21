"use client";

import { useState, useTransition } from "react";
import { buttonClass } from "@/components/button";
import { fillTitlesAction } from "./actions";

/** Fills in AI titles for sunsets without one, a batch per click (Build Spec 2.6). */
export function FillTitlesButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-3 text-caption">
      {message && <span className="text-ink-muted">{message}</span>}
      <button
        type="button"
        disabled={pending}
        className={buttonClass("secondary")}
        onClick={() =>
          start(async () => {
            const { filled, tried, left } = await fillTitlesAction();
            setMessage(
              tried === 0
                ? "Every sunset has a title."
                : `Suggested ${filled} of ${tried} titles. ${left ? `${left} still untitled.` : "All done."}`,
            );
          })
        }
      >
        {pending ? "Suggesting titles…" : "Fill in missing titles"}
      </button>
    </div>
  );
}
