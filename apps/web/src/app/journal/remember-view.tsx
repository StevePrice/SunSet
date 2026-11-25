"use client";

import { useEffect } from "react";
import { JOURNAL_SHOW_COOKIE, JOURNAL_VIEW_COOKIE, type JournalShow, type JournalView } from "@/lib/journal-view";

/**
 * Remembers the Journal view and filter on this device, so plain /journal opens them next time
 * (Build Spec 3.2 and 1.3).
 */
export function RememberView({ view, show }: { view: JournalView; show: JournalShow }) {
  useEffect(() => {
    const age = 60 * 60 * 24 * 365;
    document.cookie = `${JOURNAL_VIEW_COOKIE}=${view}; path=/journal; max-age=${age}; samesite=lax`;
    document.cookie = `${JOURNAL_SHOW_COOKIE}=${show}; path=/journal; max-age=${age}; samesite=lax`;
  }, [view, show]);
  return null;
}
