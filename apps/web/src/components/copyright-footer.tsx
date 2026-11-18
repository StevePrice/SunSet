import { copyrightLine } from "@/lib/copyright";

/** The small copyright line at the bottom of every screen: smallest type size, muted colour. */
export function CopyrightFooter() {
  return (
    <footer className="mt-auto px-4 pt-6 pb-4 text-center text-caption text-ink-muted">
      <small className="text-caption">{copyrightLine()}</small>
    </footer>
  );
}
