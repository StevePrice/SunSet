# Sunset Soul (working name)
*A place to keep and share the sunsets that move you*

---

## Objective

Create a destination where everyday people — not photographers — can capture a beautiful sunset as a personal memory, attach the story or feeling behind it, and share it first with a few close friends and, when it truly resonates, with a wider community of strangers who feel the same pull toward beautiful moments.

The goal isn't to be another photo-sharing app. It's to give people a home for something they're already doing informally (texting sunset photos to friends, posting them with little context) and give that instinct a real container — one built around memory and emotional connection rather than aesthetics or performance.

## What We're Trying to Accomplish

- Give people a simple, low-pressure way to **record** a sunset moment as it happens
- Make the **story behind the photo** — not the photo quality — the emotional core of the product
- Let sharing start **small and private** (a few friends) and expand outward only when something is worth sharing further
- Build a sense of **global, ambient connection** — the feeling that people everywhere are quietly having their own version of this same moment
- Design for **everyday people**, not photographers — no pressure around composition, gear, or skill

## Who It's For

Everyday people who are moved by beautiful, fleeting things and want to hold onto that feeling — not a photography audience. Secondary audience: people who have a genuinely good "feel-good" story attached to a sunset (a proposal, a hard year ending, a trip, a goodbye) and want a meaningful place to put it.

## Core Concept — Three Views of the Same Content

| Layer | Role | Description |
|---|---|---|
| **Journal** | Time | Your personal, private-by-default archive of sunsets and the memories attached to them. The intrinsic reason to use the app even with zero social interaction. |
| **Live Map** | Space | A global, real-time view of sunsets happening right now around the world as the sun moves across time zones. The "wow, what is this" discovery layer. |
| **Story Feed** | Emotion | A curated stream of the most resonant shared stories — not just recent posts. Where the stranger-to-stranger emotional connection happens. |

**Secondary feature — Daily Ritual:** A lightweight nudge (e.g., "sunset in your area in 20 minutes," or a rotating "today's global sunset" to react to) that encourages a daily habit without being the primary hook.

## Sharing Model

1. Post is private by default (journal only)
2. Can be shared with a small circle of friends
3. If it resonates, can be shared further into the public map/story feed

This lowers the vulnerability bar for posting (no "is this good enough for the whole world" pressure on day one) and solves the cold-start problem common to social apps.

## Naming

**Working name: Sunset Soul**

Other names considered and still in play:
- **Sunset Glow** — visual/warmth double meaning, strong contender
- **Sunset Vibe** — warm and legible, but "vibe" is a saturated word in app naming right now
- **Sunset High** — clever double meaning, but conflicts with an existing Steam game and multiple real high schools (SEO/branding noise)
- Story-forward alternates considered: Sunset Stories, Sunset Letters, Sunset Reflections (decided against — name should describe the *object*, not the *act*)

## Known Competitive Landscape

- **Sunsets Reminder** (iOS) — closest existing competitor. Offers sunset reminders, an in-app photo journal, and day streaks. Validates the core instinct that people want this, but appears to be solo-journal-focused rather than social/story-driven — leaving the map + story feed + friends-first sharing model as our differentiation.
- **SkyCandy** — sunset quality forecasting, photographer-leaning, not a direct competitor but adjacent.

## Competitive Analysis

Research into the current App Store / market landscape for sunset-focused products, and how Sunset Soul compares.

### Direct Competitors

**Sunset Challenge** (iOS)
<cite index="26-1">A social app dedicated to the sunset, where users capture and share their most beautiful sunset each day, discover sunsets from users around the world, and take part in a weekly ranking powered by community likes.</cite> <cite index="26-1">Each sunset is automatically tagged with its city and country.</cite>
- **Closest direct competitor in spirit** — daily posting habit, global discovery, community-driven ranking.
- **Gap vs. Sunset Soul:** No personal journal/archive layer, no story/memory component (captions aren't the focus), and ranking is purely social (likes) rather than an algorithmic quality score. Also no "friends-first, then public" sharing model — appears to post directly to the public gallery.

**Sunsets Reminder** (iOS)
<cite index="9-1">Sends daily reminders before sunset/sunrise based on location, lets users take a photo within the app to add to a "Sunset or Sunrise Journal," and tracks a streak, with the stated goal of getting large numbers of people to intentionally watch and log the same sunset.</cite>
- **Closest competitor to our Journal + Daily Ritual layers.**
- **Gap vs. Sunset Soul:** Solo/personal-journal focused, minimal social or story layer, no map, no scoring, no shared community feed.

**SunsetMap** (early-stage / alpha)
<cite index="27-1">An interactive map for discovering, sharing, and rating sunset viewing locations, aimed at adventurers, photographers, and geographers, with real-time sunset quality predictions planned as a future feature.</cite>
- **Closest competitor to our Live Map layer** — but oriented around *finding great locations* to watch a sunset (pre-experience, planning tool) rather than *capturing and sharing the memory* of one you already saw (post-experience, emotional/story tool). Still in alpha as of this research.
- **Gap vs. Sunset Soul:** No personal journal, no story/emotional framing, targets a more outdoors/photography-adjacent audience rather than "everyday person."

### Adjacent / Indirect Competitors

- **Sun Tracker, SkyCandy, and similar "sunset forecast" apps** — utility tools that tell you *when* and *how good* a sunset will be (using weather data), aimed heavily at photographers. Not social or memory-focused, but relevant as potential feature inspiration (sunset quality prediction) or as a complementary use case.
- **General journaling apps with "sunset" branding** (e.g., Sunset Micro Journal, Sunrise Journal) — text/mood journaling apps that use "sunset" as a name/theme only, with no actual sunset photo or sky content. Not true competitors, but noise in App Store search results for our name.
- **Instagram / general photo-sharing platforms** — where most sunset photos currently live today by default, but with no sunset-specific structure, scoring, story format, or community.
- **"All Our Suns" (data visualization project)** — <cite index="21-1">a real-time map visualization of photos tagged #sunset and #sunrise uploaded to Instagram, exploring the idea that as people move across time zones, photos of sunsets and sunrises replace a local sense of time with a global, connected one.</cite> Not a product, but validates the "sunset live map" concept as an idea with genuine resonance.

### How Sunset Soul Compares

| Feature | Sunset Challenge | Sunsets Reminder | SunsetMap | **Sunset Soul** |
|---|---|---|---|---|
| Personal journal/archive | ❌ | ✅ | ❌ | ✅ |
| Live global map | ❌ | ❌ | ✅ (location discovery, pre-sunset) | ✅ (moment-in-time, post-sunset) |
| Story/memory-driven posts | ❌ | ❌ | ❌ | ✅ |
| Friends-first, then public sharing | ❌ (public by default) | N/A (private) | ❌ | ✅ |
| Algorithmic quality score | ❌ (likes only) | ❌ | Planned (not live) | ✅ (Palette / Reach / Setting / Wow Factor) |
| Daily ritual/reminder | ✅ (daily challenge) | ✅ (streaks) | ❌ | Secondary feature |
| Target audience | General/social | Personal/individual | Photographers/adventurers | Everyday people, memory-driven |

**Takeaway:** No existing product combines all of our core layers (journal + map + story feed) with a friends-first sharing model and an actual quality-scoring algorithm. The closest competitors each own *one* piece of what we're building — Sunset Challenge owns the daily social habit, Sunsets Reminder owns the personal journal, and SunsetMap owns the map/location angle — which suggests real whitespace for a product that unifies all three around the *story*, rather than the photo alone.

## MVP Scope

**Core Hypothesis:** Will people bother capturing and keeping a record of sunsets they find meaningful — with enough emotional pull to do it repeatedly?

**Core User Flow:** Open app → see sunset (or upload a photo) → snap/select photo → add a quick memory/story (optional) → saves to personal journal, scored automatically → share out to friend circle and/or post to the live map.

### Must Have
- **Photo capture/upload** — in-app camera or gallery picker
- **Personal Journal** — private archive of every sunset saved, chronological
- **Story/memory attached to each entry** — optional caption/prompt per entry
- **The Scoring Algorithm** — simplified MVP version (see note below), applied to every saved entry
- **Share-out to friend circle** — shares the photo + score (+ story if added) *outside* the app via text/link/etc. — no in-app social graph required for MVP
- **Live Global Map** — a map of recently shared sunsets, pinned by general location. Not real-time-as-captured; instead:
  - A shared photo stays visible for a **default retention window** (placeholder: 72 hours, to be tuned later)
  - Entries with a high/extraordinary score can stay visible **longer than the default window**
  - Community-vote-driven retention is a **Phase 2** feature, layered on top of the algorithmic score once there's a real user base
- **Basic account/login** — so the journal and shared/posted history persist across sessions/devices

### Nice to Have
- Lightweight daily ritual nudge (local notification, e.g. "sunset in your area soon")

### Later (v2+)
- Public story feed
- In-app friend circle / social graph (sharing stays share-out-only for MVP)
- Community/audience voting layer (influences map retention)
- Weighted/refined scoring algorithm — start simple, refine with real data
- Physical products, brand partnerships

### Build Note: Scoring Algorithm at MVP Stage
Building full image-analysis for all four parameters (Palette, Reach, Setting, Wow Factor) is a real computer-vision effort. For MVP, recommend a **simplified version** — basic image analysis (average colors, brightness, color spread across frame) producing a plausible score — to test whether users care about receiving a score at all, before investing in a more sophisticated/trained model.

## Business Model — Open Questions (not yet decided)

- Physical products (printed photo books, calendars, prints of personal collections)
- Premium/journal subscription tier (unlimited archiving, private features, advanced map views)
- Brand partnerships (travel, wellness, mindfulness)
- Data/insight products (least emotionally resonant option — lowest priority)

## Sunset Scoring Algorithm

A four-parameter system for rating the quality of a sunset. All four are designed to be **fully discernible from a single photo** — no follow-up questions, time-lapse, or self-reported data required. Each captures a genuinely different dimension of the experience — color, breadth within the frame, place, and rarity.

**1. The Palette**
How rich and vivid the colors were — the range of hues present, how bold/saturated they were, and how smoothly they blended together.

**2. The Reach**
How much of the visible frame is filled with color — a small glowing strip near the horizon versus color saturating most or all of the shot. (Redefined from an earlier version that measured full 360° sky coverage, which isn't determinable from a single photo — this version measures the proportion of the *captured image* that shows sunset color.)

**3. The Setting**
What the sky was paired with — mountains, ocean, skyline, trees, or an open horizon. This ties the sunset to a specific place and is often what makes it feel personal rather than generic.

**4. The Wow Factor**
The rare, once-in-a-while magic visible in the shot — sunbeams/crepuscular rays breaking through clouds, a mirror-like reflection on water, a green flash, sun halos, iridescent clouds, or anything that makes someone say "I've never seen anything like that."

### Scoring Scale

Each parameter is scored **1–10**, with defined anchor points at 1, 5, and 10 so scoring stays consistent across algorithmic, human, and (eventually) user-submitted ratings.

**1. The Palette — 1 to 10**
- *1:* Single muted color, low saturation
- *5:* A couple of clear colors, moderately vivid
- *10:* Wide range of vivid, well-blended colors
- *Measured via:* color diversity + saturation analysis on the image's pixels

**2. The Reach — 1 to 10**
- *1:* Color confined to a thin band near the horizon, rest of frame neutral (sky/dark)
- *5:* Roughly half the frame shows color
- *10:* Color fills nearly the entire frame
- *Measured via:* percentage of frame pixels falling into "sunset color" ranges vs. neutral sky/dark

**3. The Setting — 1 to 10**
- *1:* Nothing distinct on the horizon, flat/empty foreground
- *5:* A recognizable but unremarkable foreground element
- *10:* A striking, well-composed silhouette (mountains, skyline, ocean, treeline) that adds real drama
- *Measured via:* image classification to detect foreground subject matter, then a complexity/composition sub-score

**4. The Wow Factor — 1 to 10**
- *1:* Nothing unusual, textbook ordinary sunset
- *5:* One notable phenomenon present (e.g., visible sun rays)
- *10:* Multiple rare phenomena clearly visible (rays, reflection, halo, etc.)
- *Measured via:* checklist-style detection — each identified phenomenon adds points, building toward the top-line score

### Composite Score

Recommended approach: **simple average** of the four parameter scores (sum ÷ 4, optionally scaled to a 100-point display score). Easiest to explain in the PRD and to end users. Weighting individual parameters more heavily (e.g., Palette and Wow Factor counting double) is a possible v2 refinement once real scoring data exists to test against.

*Open question: whether to also track a separate community/audience score alongside the algorithmic score.*

## Open Questions / Next Steps

- [ ] Finalize name (Sunset Soul vs. Sunset Glow vs. others)
- [ ] Check domain + social handle availability for finalists
- [ ] Define MVP — smallest version worth testing first
- [ ] Rough visual concept / mockup of map + journal + feed
- [ ] Define monetization path more concretely
