# Sunset Soul — Product Requirements Document (PRD)
**Status:** Draft — MVP scope
**Last updated:** November 4, 2026
**Companion doc:** Sunset Soul – Concept & Strategy (sunset-soul-concept.md)

---

## 1. Overview

Sunset Soul is a mobile app that lets everyday people capture a sunset as a personal memory, attach the story behind it, receive an automatic quality score, and share it with a small circle of friends and/or post it to a live global map.

This document defines the requirements for the **MVP** — the smallest version of the product needed to test whether people will repeatedly capture and keep meaningful sunset memories.

## 2. Goals

- Validate that users will capture sunsets as a recurring personal habit (the core hypothesis)
- Validate that users are motivated to share a captured sunset with friends
- Establish the foundation of the scoring algorithm and live map for future iteration
- Ship a lean, buildable v1 — defer anything that depends on a large existing user base

## 3. Success Metrics (draft — refine before build)

- % of new users who save a second journal entry within 7 days (repeat-use signal)
- % of saved entries that include a story/caption (engagement with the "memory" feature)
- % of saved entries that are shared out to a friend circle
- % of shared entries that receive at least one friend reaction
- % of Share Page visitors who tap "Start your own Journal" (growth signal)
- % of saved entries also posted to the live map
- Average entries saved per active user per week

## 4. Target User

Everyday people who are moved by beautiful, fleeting moments — not photographers. People who want a simple, low-pressure way to hold onto a sunset memory and occasionally share a genuinely good story behind one.

## 5. User Stories

- As a user, I want to save a photo of a sunset I just saw, so that I can keep it as a memory.
- As a user, I want to add a short story or caption to a sunset, so that the memory means more than just the photo.
- As a user, I want to see a score for my sunset, so that I understand how it compares to an "ordinary" one.
- As a user, I want to know why my sunset got its Wow score, so the score feels meaningful rather than random.
- As a user, I want to look back through my past sunsets in one place, so that I can revisit memories over time.
- As a user, I want to share a sunset (photo + score + story) with a few friends outside the app, so that I can show them a moment that mattered to me.
- As a user, I want to see how my friends reacted to a sunset I shared, so that I know it meant something to them too.
- As a friend who received a shared sunset, I want to react with a simple tap without downloading an app, so that I can respond quickly and warmly.
- As a user, I want to optionally post my sunset to a public map, so that others around the world can see it.
- As a user, I want my journal and shared history to persist across devices, so that I don't lose my memories.

## 6. Functional Requirements

### 6.1 Account / Login
- User can create an account and log in (method TBD — email, phone, or social login)
- User provides a first name at sign-up; it appears on the Share Page ("Louise shared a sunset with you")
- Journal entries and post history are tied to the account and persist across devices/reinstalls

### 6.2 Capture
- User can take a photo directly in-app (camera access) or select an existing photo from their device gallery
- After capture/selection, user is taken to an entry creation screen

### 6.3 Journal Entry Creation
- Each entry gets a short title suggested by AI, based on the photo and the story if one was added (e.g., "Standing like sticks"). The user can edit it.
- If the AI is unavailable, the user can type a title, or the title is filled in once the AI is available. Saving is never blocked.
- User can optionally add a short text story/caption to the photo (not required to save)
- Optional guided prompt may be shown (e.g., "What was happening when you took this?") to encourage story input
- User can optionally tag a general location (auto-detected via device location, editable/removable by user)
- On save, the entry is scored automatically (see 6.4) and added to the user's Journal

### 6.4 Scoring Algorithm (MVP version)
- Every saved entry is automatically scored across four parameters:
  - **The Palette** — color diversity/saturation analysis
  - **The Reach** — proportion of frame showing sunset color vs. neutral
  - **The Setting** — basic foreground/silhouette detection
  - **The Wow Factor** — the overall gut reaction to the photo, judged by an AI model that can see images (see 6.4a)
- Each parameter scored 1–10; composite score is a simple average, displayed to the user alongside the entry
- The score is calculated once when the entry is saved and stored with the entry; it does not change each time the entry is viewed
- Scoring model is explicitly a simplified v1 — not the final trained/weighted version
- Full definitions and anchor points are in the Concept doc (Sunset Scoring Algorithm)

### 6.4a The Wow Factor
**Definition:** Wow is what someone says when they see an incredible photo. The Wow Factor scores the reaction a typical person would have on first seeing the photo, not a checklist of features.

**Anchor points:**

| Score | Reaction | Meaning |
|---|---|---|
| 1 | "Nice." | A pleasant, ordinary sunset you'd scroll past |
| 3 | "Pretty." | Worth a second look |
| 5 | "Oh, that's beautiful." | You'd show it to the person next to you |
| 8 | "Wow." | You'd send it to friends; it stands out from most sunsets |
| 10 | "Is that real?" | Stops you in your tracks; people ask if it's been edited |

**Wow drivers** (any one, done strongly, can produce a high score; they are not added together):
1. Intense light — the sky looks on fire or glowing from within
2. Drama and contrast — bright light against dark shapes, storm clouds, deep shadows
3. Something rare — sun rays, reflection, halo, green flash, unusual clouds
4. Something unexpected or unique — an element that makes this sunset unlike any other
5. A phenomenal place or an icon seen in a new light — a world-famous landmark or extraordinary location transformed by sunset light (only when clearly recognizable, and shown in a fresh way, not a standard postcard view)
6. A sense of scale — vast landscapes, layered ridges, endless ocean

**Rules:**
- Judge the whole picture's impact, not individual parts.
- Avoid double counting with Palette (color) and Setting (foreground): color alone shouldn't drive a high Wow score.
- Never judge photography skill or image quality.

**Output:**
- A Wow score (1–10) and a **one-line reason** (about 15 words or fewer) explaining what makes the photo striking, shown on the Score Result screen and in Entry Detail. Example: *"Living trees standing among burned ones, glowing against the last light."*
- The reason describes only what's visible. It never identifies people. It names a landmark only when it's clearly recognizable or the user has tagged the location.

**Failure handling:** if the AI is unavailable when an entry is saved, the entry is saved with the other three scores and the Wow Factor (and composite) is completed as soon as the AI is available. No entry is lost or blocked.

### 6.4b Scoring Calibration (pre-launch requirement)
- Before launch, the founders rate a reference set of 30–50 sunset photos (ordinary to extraordinary) using the Wow anchor points.
- The AI's Wow scores on the same photos must closely match the founders' ratings before launch; the AI's instructions are adjusted until they do.
- The reference test is re-run after any change to the AI instructions or AI model.

### 6.5 Journal (Personal Archive)
- Chronological list/grid view of all saved entries
- Each entry displays photo, title, score, date, and story (if present)
- Entries with friend reactions show a small reaction indicator (see 6.9)
- Entries are private by default
- User can open an entry to view full detail (photo, title, full story, score breakdown by parameter, Wow reason line, friend reactions)

### 6.6 Sharing (Share-Out, MVP)
- From an entry, user can trigger a "Share" action
- Share generates a full-photo share card (vertical, sized for Stories) containing: the photo, title, composite score, and the story (if present)
- Tapping **Share** opens a share panel with large icons for **Instagram**, **Snapchat**, **TikTok**, and **Facebook**, plus **Messages** and a **More** button
  - Tapping an icon opens that app with the share card ready to post
  - Icons appear only for apps installed on the phone
  - **More** opens the phone's built-in share menu (email, WhatsApp, and any other app)
- **Build note — don't reinvent sharing.** This panel works the way sharing works in most popular apps. Use each platform's own free sharing tools rather than building custom sharing:
  - Instagram and Facebook: Meta's "Sharing to Stories"
  - Snapchat: Snap's Creative Kit
  - TikTok: TikTok's Share Kit
  - Messages and More: the phone's built-in share menu (iOS and Android)
  - Our job is only to create the share card image and the Share Page link, then pass them to these tools.
- Share also includes a link to a simple web page for the entry (the Share Page), where friends can react (see 6.9)
- Share uses the device's native share sheet (text, iMessage, email, other installed apps) — **no in-app friend system or social graph in MVP**
- Recipients do not need the app to view a shared entry

### 6.7 Live Global Map
- Separate map view showing sunsets that users have explicitly chosen to post publicly (distinct action from friend share-out)
- Posted entries appear as pins/markers at a general (non-precise) location
- **Retention logic:**
  - Default visibility window: placeholder **72 hours** from post time (exact duration TBD, tunable post-launch)
  - Entries with a high/extraordinary composite score may remain visible longer than the default window (exact threshold/logic TBD)
  - Community-vote-based retention is **out of scope for MVP** (Phase 2)
- Map is not real-time-as-captured; it reflects a rolling window of recent public posts, not live in-progress sunsets

### 6.8 Notifications (Nice to Have — include if feasible)
- Local notification reminding user of approximate sunset time based on device location
- User can enable/disable in settings

### 6.9 Friend Reactions

**Purpose:** Let friends respond to a shared sunset with a simple tap — no app download and no account needed. This stays within the MVP's "no friend list" rule: reactions are tied to a shared link, not to a friend connection.

#### 6.9a What friends see (Share Page)
The web page that opens when a friend taps a shared link. Its look matches the full-photo Stories share card.

- A small label at the top: *"[Name] shared a sunset with you"*
- The photo fills the top of the page
- Below it: the entry's title, composite score, and story (if present)
- Three reaction buttons: **Wow**, **Wish I was there**, **Love this!**
- The first time a friend taps a reaction, they're asked for their first name (one quick prompt; they aren't asked again on that device)
- When a friend taps a reaction:
  - The button fills with the design system's `reaction-selected` color (peach blush) and its count goes up by one
  - A box appears to add a short note to the sender, with a **Send** button in the design system's `action` color
  - Tapping the reaction again undoes it
- At the bottom: a **Start your own Journal** button that invites friends to join the app (the built-in growth path)
- No app download or account is needed to react

#### 6.9b What the user sees (Afterglow)
A screen opened from Entry Detail. The title is **"Afterglow"** in large text, with **"from your friends"** in smaller text underneath.

- A small photo and the entry title
- Reaction totals (how many of each reaction)
- A list of who reacted and any notes they left (e.g., *Steve: "Best night of the whole trip"*)
- A **Share** button at the bottom that opens the same share panel as 6.6 (Instagram, Snapchat, TikTok, Facebook, Messages, More)

**Rules**
- Reactions are positive only. No negative reactions and no reactions about the score.
- A friend can choose more than one reaction.
- Notes are optional and limited to one short line (about 100 characters).
- Friends are asked for their first name on their first tap, so the user knows who reacted.
- Friends on the Share Page see only the reaction counts. Names and notes are seen only by the user who shared.
- The user can delete any reaction or note; the counts update.
- Colors follow the Sunset Soul design system (`design-system/`): `reaction-selected` (peach blush) for tapped reactions, `action` for Send. No red.
- Basic spam protection: limit how many reactions one visitor can send on one entry.

**Not in MVP (later ideas)**
- More reactions, such as "I felt this" and "Sending love" (for tender or bittersweet stories)
- Voice-note reactions
- "Send one back" — friend replies with their own sunset
- Replying to a friend's reaction
- Push notification when a friend reacts

## 7. Screens (MVP)

1. **Onboarding / Login** — account creation, brief intro to the concept
2. **Home / Capture** — camera or photo picker entry point
3. **New Entry** — add story/caption, review/edit the AI-suggested title, confirm/edit location, save
4. **Score Result** — shows composite score, four-parameter breakdown, and Wow reason line after save
5. **Journal** — chronological grid/list of all saved entries, with reaction indicators
6. **Entry Detail** — full photo, title, story, score breakdown, Wow reason line, link to Afterglow, share action, "post to map" action
7. **Live Map** — global map view of public posted entries, tap a pin to view detail
8. **Settings** — account, notification preferences
9. **Share Page (web)** — what a friend sees when they open a shared link: photo, title, score, story, reaction buttons, note box, and "Start your own Journal" button
10. **Afterglow** (from your friends) — reactions received on an entry: totals, names, notes, and Share button

## 8. Out of Scope for MVP

- Public story feed
- In-app friend circle / social graph (sharing is share-out only; friend reactions are link-based, see 6.9)
- Community/audience voting on entries or on map retention
- Weighted or fully trained scoring algorithm
- Rare Sightings badges and collection (future feature; described in the Concept doc)
- Physical products, brand partnerships, or any monetization features
- Real-time "sunset happening now" map behavior

## 9. Open Questions / Dependencies

- [ ] Exact retention window and score threshold logic for the Live Map (currently placeholder values)
- [ ] Login method (email vs. phone vs. social)
- [ ] AI vision provider and cost per photo for the Wow Factor
- [ ] Should Palette, Reach, and Setting also use the AI vision model (possibly simpler to build and more accurate) instead of pixel analysis?
- [ ] Does the Wow reason line appear on the share card, Share Page, and Live Map?
- [ ] Location precision/privacy approach for map pins (general area vs. exact point)
- [ ] Platform priority — iOS first, Android first, or simultaneous
- [ ] Friend Reactions: does a share link stay open forever, or expire after a set time?
- [ ] Friend Reactions: can the user turn reactions off for a specific share?
