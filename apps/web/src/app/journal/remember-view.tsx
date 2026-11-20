"use client";

import { useEffect } from "react";
import { JOURNAL_VIEW_COOKIE, type JournalView } from "@/lib/journal-view";

/** Remembers the Journal view on this device, so plain /journal opens it next time (Build Spec 3.2). */
export function RememberView({ view }: { view: JournalView }) {
  useEffect(() => {
    document.cookie = `${JOURNAL_VIEW_COOKIE}=${view}; path=/journal; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, [view]);
  return null;
}
