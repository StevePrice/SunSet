"use client";

import { Button, ButtonLink } from "@/components/button";
import { useReportError } from "@/components/error-report";

// Any screen that breaks lands here instead of a blank page. The error is reported to our logs
// (server errors already are, with the same digest).
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useReportError(error);
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="font-serif text-title-2">Something went wrong</h1>
      <p className="text-ink-story">Your sunsets are safe. Please try again, and if it keeps happening, let us know.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="action" onClick={reset}>
          Try again
        </Button>
        <ButtonLink href="/journal">Go to your Journal</ButtonLink>
      </div>
    </main>
  );
}
