// Password hashing for Workers. Better Auth's default (scrypt) costs seconds of CPU per sign-in
// on Cloudflare, so new hashes use PBKDF2-SHA256 through WebCrypto, which runs natively.
// Workers caps PBKDF2 at 100,000 iterations; breached-password checks, a 10-character minimum
// and rate limits make up for the gap to OWASP's 600,000.
import { constantTimeEqual, verifyPassword as verifyScrypt } from "better-auth/crypto";

const PREFIX = "pbkdf2-sha256";
const ITERATIONS = 100_000;
const KEY_BYTES = 32;

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    KEY_BYTES * 8,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return `${PREFIX}$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword({ hash, password }: { hash: string; password: string }): Promise<boolean> {
  if (!hash.startsWith(`${PREFIX}$`)) {
    // Accounts created before the switch still have Better Auth's scrypt hashes.
    return verifyScrypt({ hash, password });
  }
  const [, iterations, salt, expected] = hash.split("$");
  const actual = await derive(password, fromBase64(salt), Number(iterations));
  return constantTimeEqual(actual, fromBase64(expected));
}
