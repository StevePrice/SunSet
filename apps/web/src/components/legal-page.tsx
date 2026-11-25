import type { ReactNode } from "react";
import Link from "next/link";
import { BackLink } from "@/components/app-nav";

// The privacy policy and terms (Phase 7a). Drafted by Claude from what the app actually does; the
// owners (and ideally a lawyer) review them before the beta. Set LEGAL_DRAFT to false once approved.
export const LEGAL_DRAFT = true;
export const LEGAL_UPDATED = "23 November 2026";
// Owner decisions, shown in brackets until filled in.
export const OPERATOR = "[the company or person running Sunset Soul]";
export const CONTACT_EMAIL = "hello@sunsetsoul.app";
export const GOVERNING_LAW = "[country or state]";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-8">
      <BackLink href="/" label="Sunset Soul" />
      <h1 className="font-serif text-title-1">{title}</h1>
      <p className="text-caption text-ink-muted">Last updated {LEGAL_UPDATED}</p>
      {LEGAL_DRAFT && (
        <p role="note" className="rounded-ss-md bg-surface-raised p-4">
          This is a draft for review during the private beta. It isn&apos;t final yet.
        </p>
      )}
      <div className="flex flex-col gap-4 leading-7">{children}</div>
      <p className="text-caption text-ink-muted">
        See also the <Link href="/privacy" className="underline">Privacy policy</Link> and the{" "}
        <Link href="/terms" className="underline">Terms</Link>.
      </p>
    </main>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-serif text-title-3">{title}</h2>
      {children}
    </section>
  );
}

export function List({ children }: { children: ReactNode }) {
  return <ul className="flex list-disc flex-col gap-2 pl-6">{children}</ul>;
}
