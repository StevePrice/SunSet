// Shared class names for elements too small to be components.

/** Text fields and text areas: raised surface, subtle border, 48px tall. */
export const fieldClass =
  "min-h-12 w-full min-w-0 rounded-ss-md border border-border-subtle bg-surface-raised px-3 py-2 text-ink placeholder:text-ink-muted";

/** Messages and errors. No red in the design system: a raised box with ink text. */
export const noticeClass = "rounded-ss-md border border-border-subtle bg-surface-raised p-3 text-ink";

/** Cards and panels on the page. Cards have no border; panels with controls use the divider. */
export const panelClass = "flex flex-col gap-3 rounded-ss-lg bg-surface-raised p-5";
