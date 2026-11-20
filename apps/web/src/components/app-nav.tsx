import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

// App navigation (Phase 4e, Build Spec 2.1), on the Journal, Entry Detail, Afterglow and You:
// - AppHeader: the logo (or a Back link) on the left and the New sunset button on the right, the
//   only place to start a new sunset;
// - BottomBar: two tabs, Journal and You, fixed to the bottom of the screen.
// Not on Welcome, New sunset, the story screens or recording (they keep Back or Cancel), and never
// on the Share Page. When Live Map ships the bar becomes Journal · Map · You.

// Line icons, 24×24, drawn in currentColor. Shapes from Lucide (https://lucide.dev), ISC licence.
function Icon({ children, size = 24 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

const camera = (
  <>
    <path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z" />
    <circle cx="12" cy="13" r="3" />
  </>
);
const grid = (
  <>
    <rect width="7" height="7" x="3" y="3" rx="1.5" />
    <rect width="7" height="7" x="14" y="3" rx="1.5" />
    <rect width="7" height="7" x="3" y="14" rx="1.5" />
    <rect width="7" height="7" x="14" y="14" rx="1.5" />
  </>
);
const person = (
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </>
);
const chevronLeft = <path d="m15 18-6-6 6-6" />;

/** The New sunset button: a secondary pill with a camera icon, 48px tall. */
export function NewSunsetButton() {
  return (
    <Link
      href="/journal/new"
      className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-ss-pill border-[1.5px] border-border-subtle bg-surface-raised px-4 text-label font-bold text-ink hover:bg-surface-sunken"
    >
      <Icon>{camera}</Icon>
      New sunset
    </Link>
  );
}

/**
 * The header on signed-in screens: the horizontal logo (36px tall, linking to the Journal), or a
 * Back link on Entry Detail and Afterglow; New sunset on the right.
 */
export function AppHeader({ back }: { back?: { href: string; label: string } }) {
  return (
    <header className="flex items-center justify-between gap-3">
      {back ? (
        <Link href={back.href} className="-ml-1 inline-flex min-h-12 items-center gap-1 text-label font-bold">
          <Icon>{chevronLeft}</Icon>
          {back.label}
        </Link>
      ) : (
        <Link href="/journal" className="inline-flex min-h-12 items-center" aria-label="Sunset Soul, your Journal">
          {/* 135px wide is 36px tall for the horizontal logo. */}
          <Logo width={135} />
        </Link>
      )}
      <NewSunsetButton />
    </header>
  );
}

export type Tab = "journal" | "you";

/**
 * The bottom bar: Journal and You, each with its word under the icon. The current tab is ink and
 * bold, the other muted. Pages with the bar get bottom padding from globals.css, so the copyright
 * line ends above it.
 */
export function BottomBar({ current }: { current: Tab }) {
  const tabs: { tab: Tab; href: string; label: string; icon: ReactNode }[] = [
    { tab: "journal", href: "/journal", label: "Journal", icon: grid },
    { tab: "you", href: "/account", label: "You", icon: person },
  ];
  return (
    <nav
      aria-label="Main"
      data-bottom-bar
      className="fixed inset-x-0 bottom-0 z-10 border-t border-divider bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-2xl">
        {tabs.map(({ tab, href, label, icon }) => {
          const selected = tab === current;
          return (
            <li key={tab} className="flex-1">
              <Link
                href={href}
                aria-current={selected ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 py-2 text-caption ${selected ? "font-bold text-ink" : "text-ink-muted"}`}
              >
                <Icon>{icon}</Icon>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
