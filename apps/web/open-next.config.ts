import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental cache yet; add the R2 cache once R2 is enabled on the account.
export default defineCloudflareConfig({});
