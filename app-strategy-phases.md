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
- Staging (`staging.sunsetsoul.app`) is deployed by hand from the `Steve` branch with `npm run deploy` in `apps/web`; pushing doesn't deploy. Migrations run first through `scripts/staging-db.sh`

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

**Share Page copy (2026-11-08):** heading "How did this sunset make you feel?", "Tap a reaction to let [Name] know.", note placeholder, "Sent! [Name] will see your reaction." thank-you, and Start your own Journal as a text link (PRD 6.9a, updated by Louise).

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
- Reaction pills get a simple line icon beside each word (no emoji). Louise chooses or approves the icon style; the design system has no icon set yet
- Share images as compressed JPEGs: the Stories card (1080×1920) and link-preview card (about 1200×630) are PNGs today, often several MB. next/og only outputs PNG, so this needs a JPEG encoder that runs on Workers. Sizes per PRD 6.6
- Share Page photo at 1600–2000 px on the long side (it serves the 2560 px display photo today): a new photo size, filled in for existing entries
- Email (PRD 6.9c), decided 2026-11-08 with Louise: email shares go through the phone's share sheet with the small JPEG; no app-sent share email

**Status:** ✅ deployed to staging 2026-11-08 (with the copyright footer, PRD section 7). The link-preview card is now a 69 KB JPEG (it was about 1.2 MB as a PNG). The reaction icons are a proposal for Louise to approve. The 1800px Share Page photo is made on the Worker the first time it's requested, so existing entries need no backfill.

### Phase 4e: MVP flow fixes (Louise, 2026-11-08)
**Goal:** the screens that exist flow simply for readers aged 50–65, with the photo and story first and the score a quiet detail. Full detail: [sunset-soul-build-spec-flow-fixes.md](sunset-soul-build-spec-flow-fixes.md); designs (dark and light): https://claude.ai/artifact/XCsz8MDaV7vdQPb6UM5Wd2.
- **Navigation:** header with the logo (36px) and a **New sunset** button; bottom bar **Journal · You**. Hidden during tasks, never on the Share Page
- **Welcome / first name** once after the first sign-in, so the Share Page says "[Name] shared a sunset with you"; name editable on You
- **Score only in Score details** on Entry Detail (owner only); off photos, the Journal, the Share Page, share images and Afterglow. The Wow line sits under the title and date; no Score Result screen
- **Entry Detail order:** photo, title, date and place, Wow line, story, recording, Edit, **Share** (one button, straight to the share menu), Afterglow row, Score details, Delete
- **Afterglow** gets the link settings (Copy link, place name, Stop sharing) and four reaction totals
- **Share Page:** title added, score removed, "Let [Name] know you saw it" / "Tap one or more, and add a note if you like.", **Sending hugs** as a fourth reaction, sunset-style icons, checkmark on a tapped reaction, two rows of two
- **Story flow:** "Add your story" (saves first) → "The story behind this moment": typing first, **Need ideas?** (story ideas replace the opening questions and the interview), **Rather talk than type?** below; microphone note, recording and review screens; **Delete recording** in Edit; no caption field. Reuse the voice work on `phase-5-voice-settings`
- **Journal:** All photos view designed (two columns by month, count), last view remembered, empty state with "Save your first sunset"
- **Fixes:** Share Page date matches the Journal (owner's time zone), one form of place names, AI titles for entries without one

**Done when:** see section 8 of the Build Spec.

**Status:** ✅ done (2026-11-20). All seven pieces (the score change and parts 1–6) are merged and on staging (`3c0a109`), and the end-of-phase phone checks passed. GeoNames is loaded on staging (162,265 towns): the 3 sunsets with a location got a town name, and 10 more got a time zone from their share link; sunsets with neither still show dates in the viewer's time zone.

**Parts done:** score (PR #15, on staging, checked on a phone); part 1 navigation and first name (PR #18, on staging 2026-11-20); part 2 Entry Detail, Share and Afterglow (PR #19, on staging 2026-11-20); part 3 Share Page and reactions (PR #20, on staging 2026-11-20); part 4 story flow (PR #21, on staging 2026-11-20); part 5 Journal and New sunset (PR #22, on staging 2026-11-20); part 6 fixes (PR #23, on staging 2026-11-20).

**Part 4 (story flow) starts from Phase 5's work, on staging since 2026-11-09:** voice recording in the browser (up to 2 minutes per answer), recordings kept privately in R2, Whisper transcription with Retry and Type instead, playback and "What you said", the opening questions with "Ask me something else" (they become Story ideas), My story in three lengths and Crafted story (they become Help me polish it), the suggested title, and the AI settings with the first-use notice. What part 4 changes is the screens around them (Build Spec 3.7–3.9): the typing box first, Need ideas?, the Rather talk than type? panel, the microphone note, the recording screen and the review / edit screen, which also replaces the temporary Edit page from part 2. It also removes the interview-first path and the caption field.

**Known gap from part 4:** the crisis-line message (shown when the old interview's follow-up questions noticed distress) no longer has a trigger, because the new screen has no follow-up questions. **Dropped for now (2026-11-23, Steve):** no safety check or crisis-line message in the beta; kept on the Later List.

**Part 6 decisions (2026-11-20):** place names come from GeoNames (towns with 1,000+ people, CC BY 4.0) in our own PostGIS `places` table, so no location goes to a geocoding service; the nearest town within 50 km, labelled "Town, State" in the US, Canada, Australia and the UK and "Town, Country" elsewhere; a typed name wins. Compared with Stadia Maps, Mapbox, OpenCage, Geoapify, MapTiler and Google (storage rights, privacy, cost); landmark names can come later with the Phase 6 map provider. One date rule: each entry has a time zone (the place's, else the phone's when saved), used everywhere. Titles: from the story after the AI notice, otherwise from the photo.

**Part 6 on staging, once, after the deploy that runs migration 0010:** `scripts/staging-db.sh node scripts/load-places.mjs` (downloads GeoNames, loads about 150,000 towns, then names existing sunsets and sets their time zones), then **Fill in missing titles** on `/admin` until it says all done.

**Phone checks for the end of 4e** (dark and light mode), all passed 2026-11-20:
- Part 1: header and bottom bar on Journal, a sunset, Afterglow and You; the bar never covers the copyright line; a new account made by email link sees Welcome once; changing the name on You changes "[Name] shared a sunset with you" on an existing link.
- Part 2: Entry Detail order (photo, title, date, Wow line, story or Add your story, Hear it in your own voice, Edit, Share, Afterglow row, Score details, Delete); **Share opens the share menu with the Stories image in one tap**, including the first time (when the link is made; if iOS refuses, "Tap again to share" works); the Afterglow row reads Not shared / No reactions yet / Shared · n reactions; Afterglow's Share again, Copy link, Place name friends see and Stop sharing (the old link stops working); the Edit page saves the story and plays and deletes recordings.
- Part 3: on the Share Page (as a friend, signed out): **[Name]** in bold, title, date and place, story, divider, "Let [Name] know you saw it"; four reactions in two rows of two, each with its new icon; a tapped reaction fills peach with a checkmark beside the count and its icon animates once (not with Reduce Motion on); tap again to undo; "Your note to [Name]", Send, "Reacting as [friend]…", "Sent!"; the new footer line. Afterglow shows four totals in two rows, including Sending hugs.
- Part 4: Add your story opens "The story behind this moment" with the typing box first; typing and Save works (also with AI help off); Need ideas? shows three ideas, More ideas, and a tapped idea sits above the box; the microphone note appears once, then the iPhone's microphone prompt; the recording screen (Cancel throws it away, the timer, the moving line, Stop, stops on its own at 2 minutes); after Stop your tidied words appear with "Your recording", Add more, Delete recording (your words stay), Help me polish it (My story lengths, Crafted story, Use this version) and a suggested title; Edit on Entry Detail opens the same screen with your words, recording, title and "What you said" / "What you wrote"; the first-use AI notice appears the first time an AI step is used, and "Turn off AI help and type" keeps the screen open; denying the microphone shows a sentence and keeps the box ready.
- Part 5: Journal Stories cards show date · place, title, three lines of story, and "Shared · n reactions" for shared sunsets; All photos shows "n sunsets" and month headings in small capitals; leaving on All photos and coming back to the Journal opens All photos; a new account sees the empty card (sun mark, No sunsets yet, Save your first sunset). New sunset: step one has Cancel, the two large cards (Take a photo opens the camera, Choose from your photos opens the library) and the note; step two has the photo, Choose a different photo, Date taken and Place with Change (the date picker and the place choices work), Add your story (saves, then the story screen), Save for now (saves, then Entry Detail); a failed upload says "Couldn't save your sunset…" and keeps the photo.
- Part 6: place names in words ("Carlsbad, California") on the Journal, Entry Detail, the story screen and new share links, never coordinates; New sunset shows the town before saving and "Or name it yourself" works; the same sunset shows the same date on the Journal, Entry Detail and the Share Page; untitled sunsets get a title when opened; the GeoNames credit on You; **the light-mode pass:** every screen against the designs' Light mode page.

### Phase 4f: Sunsets Together and November 22 updates (Louise, 2026-11-22)
**Goal:** people in sunset photos become part of the memory and the reason to share, while everything stays private until shared. Full detail: [sunset-soul-build-spec-sunsets-together.md](sunset-soul-build-spec-sunsets-together.md); requirements in PRD 6.10; designs in the row "Journey D · Sunsets Together" on the canvas; pictures 17–26 in `design/screens/`.
- **Copy and labels on 4e screens:** "Private until you share it" voice wording; Afterglow titled "From your friends" with a two-line "See what friends sent" row; Journal "Stories · Photos"; Choose from your photos first on New sunset
- **People:** the AI notices people (no face recognition); optional "Who's in this one?" names with chips; Journal filter All · With people · Pure sunset; Sunsets with [Name]
- **Sharing:** Before you share (who it's for, Include my voice) only when it applies; personal links ("Steve, you're in Louise's sunset", "I was there!"); sending all your sunsets with one person as a set
- **Two sides of the story:** every friend can add a memory on the Share Page, typed or spoken (up to 1 minute), owner-only
- **Scoring:** people never raise or lower the Wow score by themselves; photos with people added to calibration

**Done when:** see "Done when" in the Phase 4f Build Spec.

**Build order (set 2026-11-22, Steve): the beta starts partway through 4f.** Every PRD goal (the capture habit, sharing, and "photos with people are shared more") needs real users and analytics, so the beta comes as soon as the people test can be measured; the rest of 4f is built during it. Louise's build order is kept, except that scoring moves first: the scorer's "is this a sunset?" check currently rejects many photos with people, and the hidden people check belongs in the same scorer change.
1. **4f-1 Quick wins and the scorer fix:** the copy and labels (Build Spec 1.1–1.4); rewrite the "is this a sunset?" check so photos with people pass (it lists "people" as a reason to say no); the Wow rule for people (1.5); the hidden people check (2.0); one scorer version and a re-score; photos with people in the calibration set. About 1 day.
   **Status:** built (`phase-4f-1`), in review. **Deploy order:** merge → Deploy to staging (runs migration 0011) → deploy the scorer (`cd apps/scorer && npx wrangler deploy`; the staging workflow doesn't deploy it) → `/admin` → Score everything with the current scorer (v2.1 re-scores every sunset). **Still to do:** re-run the calibration set (`calibration/run.mjs`) and add photos with people to it (owner: send a few, including the ones that failed).
2. **7a Beta essentials** (Phase 7, below), then:
3. **4f-2 Names and the filter:** "Who's in this one?" with name chips; All · With people · Pure sunset (2.1, 2.2). About 1 day.
   **Status:** done and on staging (2026-11-24, migration 0012 applied); checked on Steve's phone with a photo of people (the card appeared and names saved). Migration 0012 (`entry_people`). "Who's in this one?" on the story screen when the people check says yes (a new sunset checks for up to a minute while it's scored), or from Edit with "Add who's in it" when the check missed someone; names saved with Save. The Journal filter (remembered like the view) with name chips and counts under With people, and "With Steve" on story cards; "With" chips on Entry Detail. A plain **Sunsets with [Name]** page (title, count, since, cards) so the chips lead somewhere; its "Send [Name] all your sunsets together" button comes with 4f-5. Names are in the data export and the privacy policy; analytics `names_added`, `journal_filtered` and `names_count`.
4. **4f-3 Sharing with the people in the photo:** Before you share, personal links and "I was there!", Include my voice (2.7, 2.8). About 2 days.
5. **▶ Private beta starts.**
6. **4f-4 Two sides of the story** (during the beta): friends' memories, typed then spoken (2.8, 2.6, 2.9). Recording in a friend's browser is the riskiest piece (in-app browsers often block the microphone), so real beta phones are the test. About 2–3 days.
7. **4f-5 Sunsets with [Name] and shared sets** (during the beta) (2.3–2.5). About 1.5–2 days.

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

**Status:** steps 1–2 of 4 built and on staging (2026-11-03): "Save and tell its story" on New Entry, the typed interview, My story (three lengths) and Crafted story (with or without photo details), suggested title and caption (the caption is what share cards show), "What you wrote", and "Add more to my story". A full session costs about 2 cents. Steps 3–4 are reviewed, merged into `Steve` and deployed to staging (2026-11-09, migration 0008 applied): voice answers on the Interview screen (a big mic button, "Type instead", up to 2 minutes per answer), recordings kept privately in R2 next to the photo, Whisper on Workers AI, Retry or Type instead when transcription fails, playback and "What you said" on Entry Detail, and Settings on the Account page (AI story help on/off, delete all recordings, the privacy explanation) with a one-time notice. Not yet tried on a real iPhone or with real Whisper. Known issues: two server requests hung during testing (once locally for 227 s, once on staging) and couldn't be reproduced; "Ask me something else" sometimes asks a generic "How did you feel…" question. The crisis-line message shown for safety concerns needs review before launch.

### Phase 5b: User administration
**Goal:** admins manage accounts from `/admin` instead of the database, and every admin action is on record. Planned 2026-11-18, modelled on pmtcs phase 7.

Today there are two roles (`admin`, `user`), set with `scripts/set-role.mjs` over a direct database connection. `/admin` lists users and their Journals read-only, and only Journal views are logged (`admin_views`).

Built on one branch, `phase-5b-user-admin`, off `Steve` and merged back into `Steve` by pull request. Build in this order, each part usable on its own:

a. **First admin from `ADMIN_EMAILS`:** a Worker secret listing admin emails; a matching account becomes admin when it signs in, so the deployment can never lock itself out. `set-role.mjs` stays as a fallback.
b. **Users page actions:** on `/admin`, change a user's role, disable and enable an account, sign a user out everywhere, and delete an account (photos, recordings and shares included). At least one admin must always remain, and an admin can't demote or disable themself. Check first whether Better Auth's admin plugin (set role, ban, revoke sessions, remove user) fits the existing `role` column before building these by hand.
c. **Disabling ends sessions at once:** disabling an account or lowering its role deletes its sessions in the same step, and a disabled account can't sign in by any method (password, magic link, Google, Apple).
d. **Activity log:** `admin_views` widens into a log of every admin action (who, what, which account, when): role changes, disables, sign-outs, deletes, rescoring and Journal views. Admins can read it on `/admin`.
e. **Tests:** data-access tests for each action and the last-admin rule, and a browser check on staging.

**Done when:** on staging, an admin named only by `ADMIN_EMAILS` promotes, disables (the user is signed out at once), re-enables and deletes a test account, and each step shows in the activity log.

**Status:** built (PR #10, merged into `Steve`) and deployed to staging (2026-11-18, migration 0009 applied: `admin_views` became `admin_log`, its rows kept, and `users.disabled_at` added). `ADMIN_EMAILS` is set on staging (2026-11-20). ✅ **Done when passed (2026-11-20):** a new account named only by `ADMIN_EMAILS` became admin on sign-in, then promoted, demoted, disabled (the test user was signed out at once and couldn't sign back in), re-enabled and deleted a test account, each step in the activity log; the admin's own role, disable and delete buttons were blocked.

**Later, not in 5b:** invite-only sign-up for the beta (a decision for Phase 7), self-service data export and account deletion (Phase 7's user rights, reusing 5b's delete), and a moderator role when Phase 6 adds the hide switch.

### Phase 5c: Test and deploy from CI
**Goal:** every push is tested in a running copy of the app, and staging is deployed from GitHub instead of from a laptop. Planned 2026-11-18, modelled on pmtcs phase 6.

Built on its own branch off `Steve`, merged by pull request.

a. **The app running in CI, with browser smoke tests:** a CI job starts Postgres and the app (`wrangler dev` or `opennextjs-cloudflare preview`), runs migrations, and runs a Playwright smoke suite: sign up, sign in, save an entry, open the Journal, create and open a share link, and the 5b admin actions. There is no browser test suite in the repo yet, so this part adds one. Failures are reported on the commit.
b. **"Deploy to staging" workflow:** started by hand in GitHub Actions from `Steve` (or a chosen commit) that passed CI. It runs migrations, deploys the `sunset-staging` Worker, runs the smoke suite against `staging.sunsetsoul.app`, and rolls back with `wrangler rollback` if it fails. A production workflow follows the same pattern once production exists.
c. **Restricted credentials:** CI deploys with a Cloudflare API token limited to editing Workers on this account, and migrates with a database user that can only change the schema, instead of the full-account token on the dev machine.

**Done when:** a push to `Steve` runs the smoke suite in CI, and a staging deploy started from GitHub succeeds, plus one with a deliberately failing smoke test that rolls back.

**Status:** ✅ done (2026-11-20). Pushes and pull requests run the smoke suite in CI (PRs #11, #13). Deploy to staging has run from GitHub several times since 2026-11-18. The rollback drill (PR #16: the workflow's "Fail the smoke tests on purpose" option) failed only its drill test and `wrangler rollback` restored the previous Worker version; a normal deploy of `Steve` (`21261a1`) then passed. CI deploys with an account-owned Cloudflare token limited to Workers Scripts: Edit and Account Settings: Read, and migrates as `sunset_migrator`; the app (Hyperdrive) connects as `sunset_app`, and `sunset` is left for people only (docs/ci-credentials.md).

### Git workflow (set 2026-11-18)
- One branch per phase or part, off `Steve` (e.g. `phase-5b-user-admin`), merged back into `Steve` by pull request so each part has a review record and a CI result. `Steve` → `main` stays a separate, deliberate step.
- Commit messages name the part: "Add the activity log (phase 5b d)".
- Migrations are numbered, so two branches can both create the same number. Generate a migration only on a branch that has just merged `Steve`, and regenerate it if `Steve` gains a migration before the branch merges.
- When a partner's branch and ours touch the same screens, test them together on an `integrate/...` branch before merging into `Steve`.
- Delete a branch once its pull request merges.
- **Phone checks at the end of each phase (set 2026-11-20):** each part is merged and deployed to staging as it's done, but the phone check is done once, at the end of the phase, against its "Done when" and a list of what each part changed.

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

**Split (set 2026-11-22):** everything except the beta itself is **7a Beta essentials**, built after 4f-1 and before 4f-2. Analytics record whether each photo has people (from 4f-1), so share and reaction rates can be compared for photos with and without people (PRD section 3). The crisis-line decision (no trigger since 4e part 4) is part of 7a. The **private beta** starts after 4f-3 and runs while 4f-4, 4f-5 and Phase 8 are built.

**7a status (2026-11-23):** built in two halves. **First half** (`phase-7a`, merged and on staging 2026-11-23): Delete my account and Download your sunsets (a ZIP of photos, recordings and journal.json) on You; upload caps (30 sunsets and 60 recordings per person per day); the installable web app (manifest, icons); nightly database backups to R2 with a restore drill (`docs/backups.md`); an uptime check every 15 minutes (GitHub Actions). **Second half** (`phase-7a-2`), with Steve's decisions of 2026-11-23: **analytics in PostHog**, sent from the server only, no content and no browser script (`docs/analytics.md`, events for every PRD metric that exists before the map, split by `has_people`); **monitoring with Cloudflare** Workers Logs, an error page that reports browser errors to those logs, and DigitalOcean alerts for the Droplet (`docs/monitoring.md`), no Sentry; a **draft privacy policy and terms** at /privacy and /terms, linked from every page, sign-in and You, marked as a draft; **the crisis-line message dropped** for now. **Owner tasks:** set up the backup bucket, token and service on the Droplet and run the restore drill once; create the PostHog project and add `POSTHOG_KEY`; DigitalOcean alert policy; review the privacy policy and terms (fill in who runs Sunset Soul, the contact email and the governing law, ideally with a lawyer), then set `LEGAL_DRAFT` to false.
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

### Phase 9: Native apps, a native shell around the web app (added 2026-11-20)
**Goal:** Sunset Soul in the App Store and Google Play, from the same code as the website, with native features where they're worth it. The web version stays as it is.

**Approach:** Capacitor apps for iOS and Android that load the live site (`sunsetsoul.app`) inside the app, plus native plugins. A web change reaches the apps without a store release; only native changes need one. Starts after the beta (Phase 7), once beta users show which native features matter.
- **App shells:** iOS (Xcode) and Android (Android Studio) projects in the repo, the app icon and splash screen from the design system, and links to `sunsetsoul.app` opening in the app (Universal Links and App Links)
- **Native sharing:** share straight to Instagram Stories (and Facebook and Snapchat where their SDKs allow it) with the Stories card, alongside the phone's share sheet. This is the main reason for a native app
- **Push notifications:** the Phase 8 sunset reminder and "a friend reacted" through APNs and Firebase Cloud Messaging, without installing the PWA
- **Camera, microphone and photos:** native camera and photo-library pickers that keep the photo's date and place, and the microphone for voice stories
- **Sign-in:** native Sign in with Apple and Google sign-in (Google blocks sign-in inside embedded web views); the session is shared with the web view
- **Store rules:** Sign in with Apple wherever Google sign-in is offered, account deletion inside the app (from Phase 7), privacy details for both stores (photos, recordings and words go to an AI service), and enough native features that Apple doesn't treat it as "just a website"
- **Release:** TestFlight and a Google Play internal test with the beta group, then store review. A release checklist in the repo; CI builds the apps

**Owner tasks:** Apple Developer Program ($99 a year), Google Play Console ($25 once), store listings (screenshots, description, privacy answers), and Meta and Snapchat developer accounts for direct sharing.

**Done when:** both apps are live in the stores; on a phone a user signs in with Apple or Google, saves a sunset with the native camera, tells its story by voice, shares straight to Instagram Stories, and gets a sunset reminder; and the website still works unchanged.

### Phase 10: Fully native apps (added 2026-11-20)
**Goal:** the most polished feel on each phone, if the Phase 9 shell isn't good enough. Decide after Phase 9 has been in use, based on what users say and how the app performs.

**Approach:** React Native apps built with Expo, replacing the Phase 9 shell's web view screen by screen, with the same database, storage and AI services behind them. The website stays and is still built separately, so new screens are built twice from here on.
- **An API first:** today's screens talk to the server through Next.js server actions, which native apps can't call. Add a versioned JSON API (entries, photos, stories, shares, reactions, account), used by the native apps and gradually by the web too, with tests
- **Sign-in:** Better Auth's Expo support, with Apple, Google, email and magic links, and tokens kept in the phone's secure storage
- **Screens:** the Phase 4e screens rebuilt natively, from the same design tokens (generated for React Native from `design-tokens.json`), in dark and light mode
- **Native features:** carry over Phase 9's sharing, notifications, camera and microphone; add offline drafts, so a sunset saved without signal uploads later
- **Shared code:** validation, scoring display and copy in a shared package used by web and native
- **Release:** Expo EAS builds and over-the-air updates for JavaScript changes; store releases for native changes

**Done when:** every Phase 4e screen works natively on iOS and Android with the Phase 9 features, the JSON API has tests, and the store apps are updated from the shell to the native version without users losing their sign-in or data.

### After the MVP (v2+)
- Public story feed
- In-app friend circles
- Community voting that affects map retention
- A weighted, trained scoring model
- Native iOS and Android apps: now Phases 9 (native shell) and 10 (fully native)
- Monetization: printed photo books, a premium tier

### Order and dependencies
- **0 → 1 → 2 → 3** is the critical path. Phase 2 alone tests the core hypothesis.
- **Next (set 2026-11-08):** 4b → 4c → 4d (all done), then the rest of Phase 5 (step 3 voice, step 4 Settings), then 6.
- **Updated (2026-11-08, later):** 4e (flow fixes, including the voice screens) comes before the rest of Phase 5. Phase 5 step 3 (voice) merges into 4e; step 4 (Settings) waits for the Settings screen on the Later List.
- **Next (set 2026-11-18):** 5b (user administration) → 5c (test and deploy from CI), then 6.
- **Update (2026-11-20):** 5b and 5c done. Before 6: the rest of 4e.
- **Update (2026-11-20, later):** 4e done. Next: Phase 6 (Live Global Map). Open before the beta: the crisis-line message has no trigger since part 4.
- **Update (2026-11-22):** Phase 4f (Sunsets Together) added, and comes before Phase 6: Louise has moved the Live Global Map to a later phase. Native-app items decided on 2026-11-22 (photos saving to the phone automatically, the "From today" photo strip, finding sunsets in the camera roll) are on the Later List for Phase 9.
- ~~**7** follows Phase 6, and **8** comes last.~~ Replaced on 2026-11-22, below.
- **Order (set 2026-11-22, Steve): the beta first, the map last.** 4f-1 → 7a beta essentials → 4f-2 → 4f-3 → **private beta starts** → 4f-4 and 4f-5 during the beta → 8 Daily Ritual (late in the beta or right after, to see whether reminders bring people back) → **6 Live Global Map, last of the MVP** (with the 6.10 rules: photos with people not posted by default, photos of children never) → 9 and 10 native apps after the beta. About 6–7 days of building before the beta starts, plus owner tasks (privacy policy and terms; Google and Apple sign-in if wanted for the beta).
- **Native apps (set 2026-11-20):** 9 (native shell, Capacitor) after the beta in Phase 7; 10 (fully native, React Native with Expo) only if Phase 9 isn't good enough. The web version stays throughout.

### Remaining estimates (2026-11-08)
Rough planning numbers. "Human" is one developer who knows the codebase (±30%). "With Claude, total" includes review, phone testing and fixes.

| Phase | Human alone | With Claude, coding | With Claude, total |
|---|---|---|---|
| 4b Share with friends | 4–6 days | 3–5 hours | 1.5–2 days |
| 4c Adopt the design system (with logo) | 3–3.5 days | 2.5–4 hours | about 1 day |
| 4d Design updates | 1–1.5 days | 1–1.5 hours | half a day to a day |
| 5 Story Capture, the rest | 4–5 days | 3–5 hours | 1.5–2 days |
| 5b User administration (added 2026-11-18) | 3–4 days | 2–4 hours | about 1 day |
| 5c Test and deploy from CI (added 2026-11-18) | 3–4 days | 2–4 hours | 1–1.5 days |
| 6 Live Global Map | 6–8 days | 5–8 hours | 2–3 days |
| 7 Hardening and beta | 6–8 days | 5–8 hours | 2–3 days |
| 8 Daily Ritual | 2–3 days | 2–3 hours | about a day |
| 4f Sunsets Together, all parts (added 2026-11-22) | 12–16 days | 8–12 hours | 7.5–9 days |
| **Total** | **32–43 days** | **25–43 hours** | **11.5–16 days** |
| 9 Native apps, shell (added 2026-11-20) | 8–12 days | 6–10 hours | 5–8 days, plus store review |
| 10 Fully native apps (added 2026-11-20) | 30–45 days | 25–45 hours | 4–8 weeks |

The total covers the MVP (Phases 4b to 8); Phases 9 and 10 come after it. Not included: the 2–3 week beta itself, owner tasks (map tile provider, Google and Apple sign-in, legal review), and the unreproduced hung requests from Phase 5.

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
