# Monitoring (Phase 7a)

Cloudflare's own tools plus a GitHub uptime check; no Sentry for the beta (decided 2026-11-23).

| What | Where | Who hears about it |
|---|---|---|
| Server errors (the app and the scorer) | Cloudflare Workers Logs | Look when something seems wrong, and once a day during the beta |
| Errors in people's browsers | Workers Logs, lines starting `CLIENT ERROR` | Same |
| The site being down | GitHub Actions **Uptime** workflow, every 15 minutes | GitHub emails whoever last changed the schedule in `.github/workflows/uptime.yml` |
| Droplet memory, CPU, disk | DigitalOcean Monitoring alerts | Email (set up below) |
| Nightly backups | `docker compose logs backup` on the Droplet (`BACKUP FAILED`) | Check weekly; see `docs/backups.md` |

## Reading errors in Workers Logs

Logs are on for both Workers (`"observability": { "enabled": true }` in each `wrangler.jsonc`).

Cloudflare dashboard → Workers & Pages → **sunset-staging** (or **sunset-scorer-staging**) → **Logs**:

- Filter **Level = error** for everything that went wrong on the server.
- Search `CLIENT ERROR` for screens that broke in someone's browser. Each line has the message, the path
  (without its query string), the browser, and a `digest`.
- A browser error with a `digest` came from the server: search for that digest to find the server's log
  line with the full error.

Other prefixes worth searching: `Story AI` (AI call times and failures), `Analytics` (PostHog not
accepting events), `Couldn't` (best-effort steps that failed, such as queueing a score).

Workers Logs keeps a few days of history (it depends on the plan), so look at least every couple of days during the beta.

## The error page

`app/error.tsx` (and `app/global-error.tsx` if the root layout fails) replace a broken screen with
"Something went wrong" (Try again, or go to the Journal), and post the error to `/api/client-errors`
(20 reports per IP per 10 minutes), which writes the `CLIENT ERROR` line.

## Droplet alerts (owner task, once)

DigitalOcean → Monitoring → **Create alert policy**, for the Droplet:

- Memory utilisation above **85%** for 10 minutes
- Disk utilisation above **80%** for 10 minutes
- CPU above **90%** for 15 minutes

Send them to your email. These need the DigitalOcean metrics agent; if the Droplet's Graphs tab shows
memory, it's installed already (otherwise `curl -sSL https://repos.insights.digitalocean.com/install.sh | sudo bash`).

## When the beta grows

If finding errors by hand gets slow, add Sentry (free tier): it groups repeats and emails new ones.
Only the reporting changes: the error page already catches everything in one place.
