import { getCloudflareContext } from "@opennextjs/cloudflare";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { haveIBeenPwned } from "better-auth/plugins/haveibeenpwned";
import { magicLink } from "better-auth/plugins/magic-link";
import { drizzle } from "drizzle-orm/node-postgres";
import { headers } from "next/headers";
import { connection } from "next/server";
import { Client } from "pg";
import * as schema from "@/db/schema";
import { magicLinkEmail, resetPasswordEmail, sendEmail, verifyEmailEmail } from "@/lib/email";
import { hashPassword, verifyPassword } from "@/lib/password";

type ProviderEnv = Pick<
  CloudflareEnv,
  "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET" | "APPLE_CLIENT_ID" | "APPLE_CLIENT_SECRET"
>;

export function enabledSocialProviders(env: ProviderEnv) {
  return {
    google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    apple: Boolean(env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET),
  };
}

function createAuth(env: CloudflareEnv, client: Client, runInBackground: (task: Promise<unknown>) => void) {
  const providers = enabledSocialProviders(env);
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(drizzle(client, { schema }), { provider: "pg", schema, usePlural: true }),
    telemetry: { enabled: false },
    // Apple posts its sign-in response back from its own origin.
    trustedOrigins: providers.apple ? ["https://appleid.apple.com"] : [],
    advanced: {
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
      // Work Better Auth finishes after responding, such as sending the verification email.
      backgroundTasks: { handler: runInBackground },
    },
    rateLimit: { storage: "database" },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      requireEmailVerification: true,
      password: { hash: hashPassword, verify: verifyPassword },
      sendResetPassword: ({ user, url }) => sendEmail(env, resetPasswordEmail(user.email, url)),
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: ({ user, url }) => sendEmail(env, verifyEmailEmail(user.email, url)),
    },
    socialProviders: {
      ...(providers.google && {
        google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
      }),
      ...(providers.apple && {
        apple: { clientId: env.APPLE_CLIENT_ID, clientSecret: env.APPLE_CLIENT_SECRET },
      }),
    },
    plugins: [
      magicLink({ sendMagicLink: ({ email, url }) => sendEmail(env, magicLinkEmail(email, url)) }),
      // Rejects passwords found in known breaches (k-anonymity lookup; the password never leaves).
      haveIBeenPwned(),
      nextCookies(), // must stay last
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

// Like withDb: Hyperdrive pools connections on Cloudflare's side, so each request opens one
// client (a node-postgres Pool hangs and drops connections on Workers). It closes once the
// request and any background tasks are done.
export async function withAuth<T>(fn: (auth: Auth) => Promise<T>): Promise<T> {
  const { env, ctx } = await getCloudflareContext({ async: true });
  const client = new Client({ connectionString: env.HYPERDRIVE.connectionString });
  await client.connect();
  const backgroundTasks: Promise<unknown>[] = [];
  try {
    return await fn(createAuth(env, client, (task) => backgroundTasks.push(task)));
  } finally {
    ctx.waitUntil(
      Promise.allSettled(backgroundTasks).then((results) => {
        for (const result of results) {
          if (result.status === "rejected") console.error("Auth background task failed:", result.reason);
        }
        return client.end();
      }),
    );
  }
}

// The one place pages read the signed-in user. Call it inside a <Suspense> boundary.
export async function getCurrentUser() {
  // Better Auth generates random IDs, so session reads must wait for a real request
  // rather than run during prerendering.
  await connection();
  const requestHeaders = await headers();
  const session = await withAuth((auth) => auth.api.getSession({ headers: requestHeaders }));
  if (!session) return null;
  const { id, name, email, image } = session.user;
  return { id, name, email, image };
}

export async function getEnabledSocialProviders() {
  const { env } = await getCloudflareContext({ async: true });
  return enabledSocialProviders(env);
}
