# Sunset Soul — App Strategy & Implementation Phases
**Status:** Draft. Planning the MVP build.
**Companion docs:** [sunset-soul-concept.md](sunset-soul-concept.md), [sunset-soul-prd.md](sunset-soul-prd.md), [sunset-soul-prd-story-capture.md](sunset-soul-prd-story-capture.md), [sunset-soul-interviewer-guide.md](sunset-soul-interviewer-guide.md)
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
| App and API | Next.js (TypeScript) on Cloudflare Workers, using the OpenNext adapter. Cache Components and partial prerendering are off, because pages using them hang on Workers |
| Auth | Better Auth (runs inside the app; sessions stored in Postgres). Passwords are hashed with PBKDF2-SHA256 via WebCrypto (100,000 iterations, the Workers maximum), because Better Auth's default scrypt costs seconds of CPU per sign-in on Workers |
| Database | Postgres 17 + PostGIS in a container on the Droplet. Hyperdrive query caching is **off**: cached reads broke sign-in and rate limiting. Reached by Hyperdrive through Workers VPC and a Cloudflare Tunnel. Postgres uses a Cloudflare Origin CA certificate, verified by Workers VPC (`verify_ca`) |
| Photo storage | Cloudflare R2: private originals, plus generated sizes for the Journal, map and share cards |
| Scoring | `sunset-scorer` Worker (TypeScript) fed by a Cloudflare Queue: Palette and Reach from pixels (WASM JPEG decode, 960 px analysis), Setting and Wow Factor from Claude Haiku 5.5 (Workers AI Gemma 4 available as a switch). The Python service is kept for v2 |
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

**Status: done (2026-11-02).** `https://staging.sunsetsoul.app/api/health` returns PostGIS 3.5.2 from the Droplet through Hyperdrive, Workers VPC (`verify_ca`) and the tunnel.

### Phase 1: Accounts and a first deploy
**Goal:** a real user can sign up, sign in and sign out on the live site.
- Better Auth with four sign-in methods: email magic link, email + password (verified email required, breached passwords rejected), Google, and Apple. Google and Apple switch on when their credentials are set
- Emails (magic links, verification, password reset) go through Cloudflare Email Service from `hello@sunsetsoul.app`; in local development they are logged instead
- Auth rate limits stored in Postgres, keyed on Cloudflare's client IP header
- Migrations for users, sessions, accounts, verifications and rate limits; the entries table comes in Phase 2
- Staging deploys from pushes to the `Steve` branch (for example `staging.sunsetsoul.app`). `main` is not merged until Phase 3 or 4 is tested

**Status:** sign-in built and tested locally (sign-up, email confirmation, password and magic-link sign-in, sign-out, breached-password rejection). Deployed to `https://staging.sunsetsoul.app` (Worker `sunset-staging`). **Done for email sign-in (2026-11-02):** a real sign-up received its confirmation email, verified, and signed in. Google and Apple switch on once their credentials are added.

**Owner tasks:**
- [x] Onboard `sunsetsoul.app` to Cloudflare Email Service (Email → Email Sending) so `hello@sunsetsoul.app` can send
- [ ] Google: create an OAuth client in Google Cloud Console; redirect URI `https://sunsetsoul.app/api/auth/callback/google`
- [ ] Apple: Apple Developer account ($99/yr), a Services ID and a Sign in with Apple key; return URL `https://sunsetsoul.app/api/auth/callback/apple`

**Done when:** an account can be created on staging from a phone.

### Phase 2: Capture and Journal (core hypothesis)
**Goal:** save a sunset and look back at it.
- **Upload:** camera or photo picker. The browser resizes the photo (2560 px display, 480 px thumbnail) and re-encodes it as JPEG, so the original file and its GPS metadata never leave the phone. The app stores both in R2 and serves them only to the owner
- **Photo metadata:** the date taken and location are read on the phone and shown for the user to keep, change ("use where I am now") or remove. iPhone HEIC photos are converted by Safari; desktop browsers that can't open HEIC show a clear message
- **New Entry screen:** optional story with a guided prompt, and an editable location detected automatically
- **Journal screens:** the grid and entry detail
- Entries are private by default, enforced in a single data-access layer and covered by tests

**Done when:** entries saved on a phone appear in the Journal on another device.

**Status: done (2026-11-02).** Old and new photos saved from an iPhone appear in the Journal on a Mac. Deployed to staging and tested there and locally: data-access tests against PostGIS (including that another user can't read, edit or delete an entry), and a browser test in Chrome (pick, preview, save, view, edit, delete). Entries also support editing the story, removing the location, and deleting (photos included).

### Phase 3: Scoring v1
**Goal:** every entry gets an automatic score.
- Queue plus the Python scorer container
- **Palette:** color variety and saturation, measured from the pixels
- **Reach:** the share of the frame in sunset colors, measured from the pixels
- **Setting and Wow Factor:** a vision AI model returns structured scores and the reasons behind them
- **Score Result screen:** the overall score (a simple average) and all four parts
- Every score is stored with the model version, so photos can be re-scored when the algorithm improves
- The same step flags photos that aren't sunsets or are unsafe, which the Phase 6 moderation needs

**Done when:** a saved entry shows its score within a few seconds, and the scores look right on a test set of about 30 sunsets.

**Status:** ✅ done (2026-11-03), apart from tuning; see [phase-3-scoring-design.md](phase-3-scoring-design.md). Scoring tested from Steve's phone without problems. On staging a saved sunset showed its score 7.3 s after saving. Vision provider: Claude Haiku 5.5. **Scorer v2.0 (2026-11-04):** Wow now follows the reaction-based definition in the concept doc (the vision model judges the reaction against the 1–10 anchors, guided by the six Wow drivers, with a one-line reason shown with the score). Founders calibrate with the side-by-side rating page at `/admin/calibrate` (results at `/admin/calibrate/results`); the reference photos and the scorer's results are loaded with `calibration/seed.mjs`. An admin section at `/admin` shows every user's Journal (views are logged). **Earlier tuning deferral (2026-11-03):** after reviewing the calibration labels, Steve found Wow and Reach a little off but had no specific guidance yet; revisit later, ideally by comparing real entries side by side.

### Phase 4: Share-out
**Goal:** send a sunset to friends who don't have the app.
- A share card image generated on the server (photo, overall score, story)
- A public page at `sunsetsoul.app/s/{id}` with link previews for text messages and social apps
- The phone's native share sheet, through the browser's Web Share feature

**Done when:** a link texted to an iPhone shows a rich preview and opens without an account.

**Status:** ✅ done (2026-11-03). Tested from Steve's iPhone with a friend: the preview showed in Messages and the link opened without an account. Each entry gets a "Create a share link" panel: an unguessable link at `/s/{id}`, the native share sheet, Copy link, an optional place name typed by the owner (the exact location is never shared), and Stop sharing, which kills the link for good. The card (photo, story, score, name, date in the owner's time zone) is drawn with `next/og` and cached in R2. The automated browser test passes on staging. Follow-ups: the card is a ~1.2 MB PNG (fine for iMessage; some apps, such as WhatsApp, may skip previews that large), and accounts created by magic link have no display name yet.

### Phase 4b: Share with friends
**Goal:** friends who receive a shared sunset can react to it, and the sender sees their reactions. See PRD sections 6.6 and 6.9.
- **Share Page** (`/s/{id}`): "[Name] shared a sunset with you", the photo across the top, then title, score and story
- **Reactions:** Wow, Wish I was there, Love this! No account needed. A friend gives their first name on their first tap (remembered on that device), can add an optional note of about 100 characters, can choose more than one reaction, and taps again to undo. Friends see counts only; names and notes are private to the sender
- **Spam limit** on reactions per visitor per entry
- **Afterglow screen** from Entry Detail: reaction totals, who reacted, their notes, deleting a reaction, and a Share button
- **Reaction indicator** on Journal entries
- **Vertical Stories card** (1080×1920), alongside the current link-preview card
- **Share panel:** Messages and More (the phone's share sheet with the Stories image attached). Direct Instagram, Snapchat, TikTok and Facebook buttons need a native app and wait until then
- **Start your own Journal** button on the Share Page

**Done when:** a friend reacts from a texted link on an iPhone without an account, and the sender sees the reaction and note in Afterglow.

**Decision (2026-11-08):** reaction colours follow the design system (peach blush for a tapped reaction), not the gold and turquoise first written in the PRD. Screens are built with plain styling, since Phase 4c restyles them.

### Phase 4c: Adopt the design system
**Goal:** the app looks like Sunset Soul, and future look-and-feel changes are a one-file edit. See [design-system/README.md](design-system/README.md) and [brand/logo/LOGO-USAGE.md](brand/logo/LOGO-USAGE.md).
- Import `design-system/web/tokens.css` and map it to role-based Tailwind names (`bg-surface`, `text-ink`, `bg-action`, `bg-score` …), dark mode included
- Brand fonts: Fraunces (headings) and Atkinson Hyperlegible (body)
- Shared components: `Button`, `ScoreBadge`, `PhotoCard`, `ReactionChip`
- Replace every hard-coded colour (189 in 23 files at last count) with the role names
- A TypeScript token file generated from `design-tokens.json` for the share-card renderer, which can't read CSS
- A lint/CI check that fails on raw palette classes or hex colours in pages
- **Logo:** home and sign-in pages, a header on Journal, Entry Detail and Account, the Share Page footer, favicon and iPhone home-screen icon, and HTML versions of the sign-in, confirmation and reset emails

**Done when:** no page uses a raw colour, the lint check passes in CI, and changing a token in `tokens.css` changes the app everywhere.

### Phase 4d: Design updates (Louise, 2026-11-05)
- Share and Stories cards: the logo mark top-left (12pt in, 24pt on Stories cards), the score badge bottom-right
- Photo framing: full bleed only at the top of Entry Detail, on the score reveal and on Stories cards; inset 16pt with 14pt corners elsewhere
- Journal with two views: **Stories** and **All photos** (two columns, grouped by month)
- Light-mode rule: `score` and `reaction-selected` are fills only, never text or icon colours

### Phase 5: AI Story Capture
**Goal:** telling the story behind a sunset is easy, mostly by speaking. See [sunset-soul-prd-story-capture.md](sunset-soul-prd-story-capture.md) and [sunset-soul-interviewer-guide.md](sunset-soul-interviewer-guide.md).
- **Opening questions:** three questions tailored to the photo, with "Ask me something else". A fixed set of three is shown if the photo can't be analyzed
- **Interview:** one follow-up question at a time, up to 3, with "Keep going" (primary), "Ask me something else" and "That's my story". Questions reuse the user's own words for key facts
- **Voice first:** a large mic button, with "Type instead" always available. Audio is recorded in the browser, stored privately in R2 next to the photo, and transcribed by a speech-to-text model
- **Written story:** "My story" (light polish, the default, in three lengths) and "Crafted story" (generated only when viewed). Both can be edited by hand, and each is saved once generated. The app also suggests a title and a one-line caption
- **Original words:** "What you said" (a cleaned-up transcript, with playback) or "What you wrote" on Entry Detail. Private, never shared
- **Photo details:** the Crafted story may use what's clearly visible in the photo, including the phenomena Phase 3 already detects
- **Accuracy rules** from the Interviewer Guide go in the prompts, checked against a small set of test sessions
- **Settings:** turn AI story help off, delete all recordings. A first-use notice says the photo, recording and words are processed by an AI service
- **Failure handling:** if transcription or the AI fails, the recording and entry are still saved, and the user can type instead or retry later
- **Limits:** a daily cap on sessions per user, like scoring

**Done when:** on a phone, a user can speak a story, answer follow-ups, pick a style, save, and later play the recording back and read "What you said", with no entry ever lost to an AI error.

**Decisions (2026-11-03):** Whisper on Workers AI for speech-to-text; Claude Haiku 5.5 for questions and Claude Sonnet 5.5 for writing (on the guide's worked examples Haiku added details the user never said, Sonnet didn't); everything free during the beta, with a cap of 150 AI calls per user per day; the PRD's placeholders for its open questions (3 follow-ups, ~2-minute recordings, English only, one gentle extra question after a very short first answer, one length for Crafted story).

**Status:** steps 1–2 of 4 built and on staging (2026-11-03): "Save and tell its story" on New Entry, the typed interview, My story (three lengths) and Crafted story (with or without photo details), suggested title and caption (the caption is what share cards show), "What you wrote", and "Add more to my story". A full session costs about 2 cents. Next: step 3 (voice: recording, Whisper, playback, "What you said") and step 4 (Settings: AI help off, delete recordings). Known issues: two server requests hung during testing (once locally for 227 s, once on staging) and couldn't be reproduced; "Ask me something else" sometimes asks a generic "How did you feel…" question. The crisis-line message shown for safety concerns needs review before launch.

### Phase 6: Live Global Map
**Goal:** public sunsets on a world map.
- A "Post to map" action, separate from share-out
- Public pins rounded to roughly city level; the exact location is never public
- `visible_until` = posting time + 72 hours + a bonus based on the score (both values tunable)
- MapLibre map with clustering, loading only the pins in the area being viewed
- Moderation: automatic rejection from the Phase 3 check, a report button, and an admin hide switch

**Done when:** test posts from several cities appear and disappear on schedule.

### Phase 7: Hardening and beta
**Goal:** safe to put in front of real people.
- **Backups:** nightly `pg_dump` to R2, with a tested restore
- **Monitoring:** Sentry for errors, an uptime check, and memory alerts for the Droplet
- **Analytics (PostHog):** the PRD's success metrics (a second entry within 7 days, story rate, share rate, map-post rate)
- **Limits:** caps on uploads and requests per user
- **User rights and legal:** account deletion, data export, a privacy policy and terms
- **PWA:** installable from the browser to the home screen
- **Private beta:** 10–20 people for 2–3 weeks

**Done when:** the beta runs for a week with no data loss or crashes, and the metrics are being collected.

### Phase 8: Daily Ritual (nice to have)
- A notification shortly before local sunset, timed by a sunset-time calculation on the device. On iOS this only works once the PWA is installed
- Notification settings in the Settings screen

### After the MVP (v2+)
- Public story feed
- In-app friend circles
- Community voting that affects map retention
- A weighted, trained scoring model
- Native iOS and Android apps (possibly React Native with Expo). Revisit after the beta: direct Instagram, Snapchat, TikTok and Facebook share buttons need a native app
- Monetization: printed photo books, a premium tier

### Order and dependencies
- **0 → 1 → 2 → 3** is the critical path. Phase 2 alone tests the core hypothesis.
- **Next (set 2026-11-08):** 4b → 4c → 4d, then the rest of Phase 5 (step 3 voice, step 4 Settings), then 6.
- **7** follows Phase 6, and **8** comes last.

### Remaining estimates (2026-11-08)
Rough planning numbers. "Human" is one developer who knows the codebase (±30%). "With Claude, total" includes review, phone testing and fixes.

| Phase | Human alone | With Claude, coding | With Claude, total |
|---|---|---|---|
| 4b Share with friends | 4–6 days | 3–5 hours | 1.5–2 days |
| 4c Adopt the design system (with logo) | 3–3.5 days | 2.5–4 hours | about 1 day |
| 4d Design updates | 1–1.5 days | 1–1.5 hours | half a day to a day |
| 5 Story Capture, the rest | 4–5 days | 3–5 hours | 1.5–2 days |
| 6 Live Global Map | 6–8 days | 5–8 hours | 2–3 days |
| 7 Hardening and beta | 6–8 days | 5–8 hours | 2–3 days |
| 8 Daily Ritual | 2–3 days | 2–3 hours | about a day |
| **Total** | **26–35 days** | **21–35 hours** | **9.5–13.5 days** |

Not included: the 2–3 week beta itself, owner tasks (map tile provider, Google and Apple sign-in, legal review, the crisis-line message), and the unreproduced hung requests from Phase 5.

---

## 3. Phase 0 Checklist

### Owner tasks (account and payment steps)
- [x] **`sunsetsoul.app` is on the Cloudflare account** of `stevepricesd@gmail.com`. Turn on auto-renew.
- [x] **Workers Paid ($5/mo)** subscribed.
- [x] **R2** enabled.
- [x] **Zero Trust** set up.
- [x] **Account API token** created; stored in `~/.config/sunset/` on the dev machine, never in the repo. Wrangler's own sign-in covers Hyperdrive, R2 and tunnel creation.
- [x] **Droplet work approved.**
- [x] **Create a Cloudflare Origin CA certificate** for `db.sunsetsoul.app` (SSL/TLS → Origin Server → Create Certificate, RSA, 15 years). Save the certificate and key to `~/.config/sunset/db-tls/server.crt` and `server.key`.
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
- [x] Install the Origin CA certificate in Postgres
- [x] Workers VPC service `sunset-db` (`verify_ca`) and Hyperdrive configuration `sunset-db`
- [x] Staging Worker at `staging.sunsetsoul.app` that reads from the database

### Already done
- [x] 2 GB swap added to `aardvarkz` (swappiness 10)
- [x] Domain `sunsetsoul.app` purchased
- [x] Wrangler signed in to the Cloudflare account
