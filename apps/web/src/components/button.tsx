import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ComponentProps } from "react";

// Buttons from the design system. Use one "action" button per screen (Save, Send, Share ...);
// everything else is "secondary". 52px tall, at least 48px wide, and the label grows with the
// phone's text size.
export type ButtonVariant = "action" | "secondary";

const base =
  "inline-flex min-h-13 min-w-12 items-center justify-center gap-2 rounded-ss-md px-5 py-2 text-center text-label font-bold disabled:opacity-50";
const variants: Record<ButtonVariant, string> = {
  action: "bg-action text-on-action hover:bg-action/90",
  secondary: "border border-border-subtle bg-transparent text-ink hover:bg-surface-raised",
};

export function buttonClass(variant: ButtonVariant = "secondary", className = ""): string {
  return `${base} ${variants[variant]} ${className}`.trim();
}

export function Button({
  variant = "secondary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}

/** A link that looks like a button. */
export function ButtonLink({
  variant = "secondary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

/** A plain <a> that looks like a button, for non-page links such as sms:. */
export function ButtonAnchor({
  variant = "secondary",
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: ButtonVariant }) {
  return <a className={buttonClass(variant, className)} {...props} />;
}
