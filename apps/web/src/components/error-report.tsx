"use client";

import { useEffect } from "react";

/** Sends the error to /api/client-errors once, so it lands in the Worker's logs. Best effort. */
export function useReportError(error: Error & { digest?: string }) {
  useEffect(() => {
    fetch("/api/client-errors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: error.message || error.name, digest: error.digest ?? null, path: window.location.pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);
}
