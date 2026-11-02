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

function linkEmail(to: string, subject: string, intro: string, action: string, url: string) {
  const text = `${intro}\n\n${action}: ${url}\n\nIf you didn't ask for this, you can ignore this email.`;
  const html = `<p>${intro}</p><p><a href="${escapeHtml(url)}">${action}</a></p><p>If you didn't ask for this, you can ignore this email.</p>`;
  return { to, subject, text, html };
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
