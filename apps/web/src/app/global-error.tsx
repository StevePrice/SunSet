"use client";

import { useReportError } from "@/components/error-report";
import "./globals.css";

// When the root layout itself fails. It replaces the whole page, so it brings its own html and body
// and keeps to plain markup.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useReportError(error);
  return (
    <html lang="en">
      <body className="flex min-h-full flex-col items-center justify-center gap-5 px-6 text-center">
        <h1 className="text-title-2">Something went wrong</h1>
        <p>Your sunsets are safe. Please try again in a moment.</p>
        <button type="button" onClick={reset} className="min-h-12 underline">
          Try again
        </button>
      </body>
    </html>
  );
}
