# Sunset Soul — App Strategy & Implementation Phases
**Status:** Draft. Planning the MVP build.
**Companion docs:** [sunset-soul-concept.md](sunset-soul-concept.md), [sunset-soul-prd.md](sunset-soul-prd.md)
**Domain:** `sunsetsoul.app` (registered with Cloudflare)

---

## 1. Architecture Summary

Sunset Soul is a web app (installable as a PWA). The app runs on Cloudflare, and the database runs in a container on our existing DigitalOcean Droplet.

```
 Browser ──► Cloudflare Workers (Next.js app + API)
                  │            │
                  │            ├──► R2 (photos, backups)
                  │            └──► Queues ──► Containers (Python scorer)
                  │
             Hyperdrive (connection pooling + read caching)
                  │
   Workers VPC → Cloudflare Tunnel (outbound only, no open port, no public hostname)
                  │
┌──────── DigitalOcean Droplet "aardvarkz" (sfo3) ────────┐
│  /opt/sunset:  cloudflared ──► PostGIS (Postgres 17)     │
│  /opt/pmtcs:   existing PMTCS stack (unchanged)          │
└──────────────────────────────────────────────────────────┘
```

| Concern | Choice |
|---|---|
| App and API | Next.js (TypeScript) on Cloudflare Workers, using the OpenNext adapter |
| Auth | Better Auth (runs inside the app; sessions stored in Postgres) |
| Database | Postgres 17 + PostGIS in a container on the Droplet, reached by Hyperdrive through Workers VPC and a Cloudflare Tunnel. Postgres uses a Cloudflare Origin CA certificate, verified by Workers VPC (`verify_ca`) |
| Photo storage | Cloudflare R2: private originals, plus generated sizes for the Journal, map and share cards |
| Scoring | Python service (Pillow/OpenCV) on Cloudflare Containers, fed by Cloudflare Queues. The Worker sends it photo bytes and stores the results, so the scorer needs no storage or database credentials. A vision AI model scores Setting and Wow Factor |
| Map | MapLibre GL with a hosted tile provider |
| Schema ownership | TypeScript migrations (Drizzle). The Python worker uses plain SQL against the same tables |

### Hosting constraints
- **Droplet `aardvarkz`:** 2 GB RAM, 1 vCPU, 50 GB disk, with a 2 GB swap file. It is shared with PMTCS, which uses about 650 MB. SunSet's Postgres is capped at about 384 MB (`shared_buffers=96MB`, `max_connections=20`).
- **Never build container images on the Droplet.** CI builds them, and the Droplet only pulls.
- **When to scale:** if available memory stays below about 300 MB, resize the Droplet to 4 GB ($24/mo) or move the database to DO Managed Postgres ($15.15/mo).

### Estimated monthly cost (MVP)
| Item | Cost |
|---|---|
| Cloudflare Workers Paid (covers Workers, Containers, Queues and Hyperdrive) | $5.00 |
| Cloudflare R2 | about $0–1 |
| Postgres on the existing Droplet | $0 extra |
| Domain `sunsetsoul.app` | Yearly, at cost |

---

## 2. Phases

### Phase 0: Foundations
**Goal:** all the accounts, servers and project scaffolding exist before any app features.
- **Cloudflare:** Workers Paid plan, R2 enabled, Zero Trust (Free plan), and `sunsetsoul.app` active on the account
- **R2 buckets:** `sunset-photos` and `sunset-backups`
- **Droplet:** the `/opt/sunset` Compose stack (PostGIS with memory limits, plus `cloudflared`) and the database tunnel. Postgres has TLS on and listens only on the internal network
- **Workers VPC service** for the tunnel, and a **Hyperdrive** configuration that uses it
- **Repo layout:** `apps/web`, `services/scorer`, `db/migrations`, `deploy/`, `.github/workflows/`
- **CI:** type-check, test, and build container images
- **Local development:** `docker compose up` runs PostGIS and the scorer; Wrangler simulates R2 and Hyperdrive

**Done when:** a placeholder page on a test address under `sunsetsoul.app` reads from the Droplet's database through Hyperdrive.

### Phase 1: Accounts and a first deploy
**Goal:** a real user can sign up, sign in and sign out on the live site.
- Better Auth with four sign-in methods: email magic link, email + password (verified email required, breached passwords rejected), Google, and Apple. Google and Apple switch on when their credentials are set
- Emails (magic links, verification, password reset) go through Cloudflare Email Service from `hello@sunsetsoul.app`; in local development they are logged instead
- Auth rate limits stored in Postgres, keyed on Cloudflare's client IP header
- Migrations for users, sessions, accounts, verifications and rate limits; the entries table comes in Phase 2
- Staging deploys from pushes to the `Steve` branch (for example `staging.sunsetsoul.app`). `main` is not merged until Phase 3 or 4 is tested

**Status:** sign-in built and tested locally (sign-up, email confirmation, password and magic-link sign-in, sign-out, breached-password rejection). Waiting on the database connection from Phase 0 to deploy.

**Owner tasks:**
- [ ] Onboard `sunsetsoul.app` to Cloudflare Email Service (Email → Email Sending) so `hello@sunsetsoul.app` can send
- [ ] Google: create an OAuth client in Google Cloud Console; redirect URI `https://sunsetsoul.app/api/auth/callback/google`
- [ ] Apple: Apple Developer account ($99/yr), a Services ID and a Sign in with Apple key; return URL `https://sunsetsoul.app/api/auth/callback/apple`

**Done when:** an account can be created on staging from a phone.

### Phase 2: Capture and Journal (core hypothesis)
**Goal:** save a sunset and look back at it.
- **Upload:** camera or photo picker, sent straight from the browser to R2 through a signed upload link
- **Photo processing** in the worker: HEIC → JPEG, GPS metadata removed, and thumbnail, display and share sizes generated
- **New Entry screen:** optional story with a guided prompt, and an editable location detected automatically
- **Journal screens:** the grid and entry detail
- Entries are private by default, enforced in a single data-access layer and covered by tests

**Done when:** entries saved on a phone appear in the Journal on another device.

### Phase 3: Scoring v1
**Goal:** every entry gets an automatic score.
- Queue plus the Python scorer container
- **Palette:** color variety and saturation, measured from the pixels
- **Reach:** the share of the frame in sunset colors, measured from the pixels
- **Setting and Wow Factor:** a vision AI model returns structured scores and the reasons behind them
- **Score Result screen:** the overall score (a simple average) and all four parts
- Every score is stored with the model version, so photos can be re-scored when the algorithm improves
- The same step flags photos that aren't sunsets or are unsafe, which the Phase 5 moderation needs

**Done when:** a saved entry shows its score within a few seconds, and the scores look right on a test set of about 30 sunsets.

### Phase 4: Share-out
**Goal:** send a sunset to friends who don't have the app.
- A share card image generated on the server (photo, overall score, story)
- A public page at `sunsetsoul.app/s/{id}` with link previews for text messages and social apps
- The phone's native share sheet, through the browser's Web Share feature

**Done when:** a link texted to an iPhone shows a rich preview and opens without an account.

### Phase 5: Live Global Map
**Goal:** public sunsets on a world map.
- A "Post to map" action, separate from share-out
- Public pins rounded to roughly city level; the exact location is never public
- `visible_until` = posting time + 72 hours + a bonus based on the score (both values tunable)
- MapLibre map with clustering, loading only the pins in the area being viewed
- Moderation: automatic rejection from the Phase 3 check, a report button, and an admin hide switch

**Done when:** test posts from several cities appear and disappear on schedule.

### Phase 6: Hardening and beta
**Goal:** safe to put in front of real people.
- **Backups:** nightly `pg_dump` to R2, with a tested restore
- **Monitoring:** Sentry for errors, an uptime check, and memory alerts for the Droplet
- **Analytics (PostHog):** the PRD's success metrics (a second entry within 7 days, story rate, share rate, map-post rate)
- **Limits:** caps on uploads and requests per user
- **User rights and legal:** account deletion, data export, a privacy policy and terms
- **PWA:** installable from the browser to the home screen
- **Private beta:** 10–20 people for 2–3 weeks

**Done when:** the beta runs for a week with no data loss or crashes, and the metrics are being collected.

### Phase 7: Daily Ritual (nice to have)
- A notification shortly before local sunset, timed by a sunset-time calculation on the device. On iOS this only works once the PWA is installed
- Notification settings in the Settings screen

### After the MVP (v2+)
- Public story feed
- In-app friend circles
- Community voting that affects map retention
- A weighted, trained scoring model
- Native iOS and Android apps
- Monetization: printed photo books, a premium tier

### Order and dependencies
- **0 → 1 → 2 → 3** is the critical path. Phase 2 alone tests the core hypothesis.
- **4 and 5** can be built in parallel after Phase 3.
- **6** follows Phase 5, and **7** comes last.

---

## 3. Phase 0 Checklist

### Owner tasks (account and payment steps)
- [x] **`sunsetsoul.app` is on the Cloudflare account** of `stevepricesd@gmail.com`. Turn on auto-renew.
- [x] **Workers Paid ($5/mo)** subscribed.
- [x] **R2** enabled.
- [x] **Zero Trust** set up.
- [x] **Account API token** created; stored in `~/.config/sunset/` on the dev machine, never in the repo. Wrangler's own sign-in covers Hyperdrive, R2 and tunnel creation.
- [x] **Droplet work approved.**
- [ ] **Create a Cloudflare Origin CA certificate** for `db.sunsetsoul.app` (SSL/TLS → Origin Server → Create Certificate, RSA, 15 years). Save the certificate and key to `~/.config/sunset/db-tls/server.crt` and `server.key`.
- [ ] **Decide the sign-in methods** for Phase 1. Apple sign-in needs an Apple Developer account ($99/yr).

### Engineering tasks
- [x] Repo scaffold (monorepo layout, TypeScript and Python tooling, lint and test)
- [x] Local `docker compose` stack (PostGIS and scorer; Wrangler simulates R2 and Hyperdrive)
- [x] CI workflow (lint, type-check, test, Worker build, scorer image build)
- [x] `/opt/sunset` Compose file, with TLS for Postgres (`deploy/droplet/`)
- [x] Deploy `/opt/sunset` to the Droplet with generated database credentials
- [x] R2 buckets `sunset-photos` and `sunset-backups`
- [x] Cloudflare Tunnel `sunset-db` and the `cloudflared` container (4 connections registered)
- [x] Initial migration applied on the Droplet database (PostGIS 3.5.2)
- [ ] Install the Origin CA certificate in Postgres
- [ ] Workers VPC service (`verify_ca`) and Hyperdrive configuration
- [ ] Placeholder Worker on a test address under `sunsetsoul.app` that reads from the database

### Already done
- [x] 2 GB swap added to `aardvarkz` (swappiness 10)
- [x] Domain `sunsetsoul.app` purchased
- [x] Wrangler signed in to the Cloudflare account
