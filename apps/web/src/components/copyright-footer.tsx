import Link from "next/link";
import { copyrightLine } from "@/lib/copyright";

/** The small line at the bottom of every screen: copyright, Privacy and Terms. */
export function CopyrightFooter() {
  return (
    <footer className="mt-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 pt-6 pb-4 text-center text-caption text-ink-muted">
      <small className="text-caption">{copyrightLine()}</small>
      <Link href="/privacy" className="inline-flex min-h-12 items-center underline">
        Privacy
      </Link>
      <Link href="/terms" className="inline-flex min-h-12 items-center underline">
        Terms
      </Link>
    </footer>
  );
}
