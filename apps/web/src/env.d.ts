// Optional secrets. `wrangler types` skips them because they're blank in .dev.vars.example;
// Google and Apple sign-in are enabled only when both of a provider's values are set.
interface CloudflareEnv {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  APPLE_CLIENT_ID?: string;
  APPLE_CLIENT_SECRET?: string;
}
