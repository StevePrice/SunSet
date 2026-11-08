import { colors, radius } from "@/lib/design-tokens.generated";

export type EmailMessage = { to: string; subject: string; text: string; html: string };

type EmailEnv = Pick<CloudflareEnv, "EMAIL" | "EMAIL_FROM" | "NEXTJS_ENV">;

// In local development the message is logged instead of sent, so sign-in links can be
// copied from the `next dev` output.
export async function sendEmail(env: EmailEnv, message: EmailMessage): Promise<void> {
  if (env.NEXTJS_ENV === "development") {
    console.log(`[email] to=${message.to} subject="${message.subject}"\n${message.text}`);
    return;
  }
  await env.EMAIL.send({ from: env.EMAIL_FROM, ...message });
}

// The horizontal logo for light backgrounds, served from the app's public/ folder. Emails need a
// PNG with an absolute URL; the link we're sending is on the app's own domain, so it gives the origin.
export const EMAIL_LOGO_PATH = "/brand/sunset-soul-logo-horizontal-transparent-for-light-backgrounds.png";

function linkEmail(to: string, subject: string, intro: string, action: string, url: string) {
  const text = `${intro}\n\n${action}: ${url}\n\nIf you didn't ask for this, you can ignore this email.`;
  return { to, subject, text, html: linkEmailHtml(intro, action, url) };
}

// Simple table layout with inline styles, which email apps understand. Light colours from the
// design system: emails are read on white or cream more often than not.
function linkEmailHtml(intro: string, action: string, url: string): string {
  const c = colors.light;
  const href = escapeHtml(url);
  const logo = escapeHtml(`${new URL(url).origin}${EMAIL_LOGO_PATH}`);
  const sans = "'Atkinson Hyperlegible', Verdana, Arial, sans-serif";
  return `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:${c.surfacePage};color:${c.ink};font-family:${sans};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.surfacePage};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
<tr><td style="padding-bottom:24px;"><img src="${logo}" alt="Sunset Soul" width="180" height="48" style="display:block;border:0;width:180px;height:auto;"></td></tr>
<tr><td style="font-size:18px;line-height:26px;color:${c.ink};padding-bottom:24px;">${escapeHtml(intro)}</td></tr>
<tr><td style="padding-bottom:24px;"><a href="${href}" style="display:inline-block;background:${c.action};color:${c.onAction};font-size:17px;font-weight:bold;line-height:22px;text-decoration:none;padding:15px 24px;border-radius:${radius.md}px;">${escapeHtml(action)}</a></td></tr>
<tr><td style="font-size:15px;line-height:20px;color:${c.inkMuted};">If you didn't ask for this, you can ignore this email.</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function magicLinkEmail(to: string, url: string): EmailMessage {
  return linkEmail(
    to,
    "Your Sunset Soul sign-in link",
    "Use this link to sign in to Sunset Soul. It expires in 5 minutes.",
    "Sign in",
    url,
  );
}

export function verifyEmailEmail(to: string, url: string): EmailMessage {
  return linkEmail(
    to,
    "Confirm your email for Sunset Soul",
    "Confirm your email address to finish creating your Sunset Soul account.",
    "Confirm email",
    url,
  );
}

export function resetPasswordEmail(to: string, url: string): EmailMessage {
  return linkEmail(
    to,
    "Reset your Sunset Soul password",
    "Use this link to choose a new password for Sunset Soul.",
    "Reset password",
    url,
  );
}
