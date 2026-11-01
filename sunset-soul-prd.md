# Sunset Soul — Product Requirements Document (PRD)
**Status:** Draft — MVP scope
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
- % of saved entries also posted to the live map
- Average entries saved per active user per week

## 4. Target User

Everyday people who are moved by beautiful, fleeting moments — not photographers. People who want a simple, low-pressure way to hold onto a sunset memory and occasionally share a genuinely good story behind one.

## 5. User Stories

- As a user, I want to save a photo of a sunset I just saw, so that I can keep it as a memory.
- As a user, I want to add a short story or caption to a sunset, so that the memory means more than just the photo.
- As a user, I want to see a score for my sunset, so that I understand how it compares to an "ordinary" one.
- As a user, I want to look back through my past sunsets in one place, so that I can revisit memories over time.
- As a user, I want to share a sunset (photo + score + story) with a few friends outside the app, so that I can show them a moment that mattered to me.
- As a user, I want to optionally post my sunset to a public map, so that others around the world can see it.
- As a user, I want my journal and shared history to persist across devices, so that I don't lose my memories.

## 6. Functional Requirements

### 6.1 Account / Login
- User can create an account and log in (method TBD — email, phone, or social login)
- Journal entries and post history are tied to the account and persist across devices/reinstalls

### 6.2 Capture
- User can take a photo directly in-app (camera access) or select an existing photo from their device gallery
- After capture/selection, user is taken to an entry creation screen

### 6.3 Journal Entry Creation
- User can optionally add a short text story/caption to the photo (not required to save)
- Optional guided prompt may be shown (e.g., "What was happening when you took this?") to encourage story input
- User can optionally tag a general location (auto-detected via device location, editable/removable by user)
- On save, the entry is scored automatically (see 6.4) and added to the user's Journal

### 6.4 Scoring Algorithm (MVP version)
- Every saved entry is automatically scored using a simplified image-analysis model across four parameters:
  - **The Palette** — color diversity/saturation analysis
  - **The Reach** — proportion of frame showing sunset color vs. neutral
  - **The Setting** — basic foreground/silhouette detection
  - **The Wow Factor** — detection of visible notable elements (e.g., sunbeams, reflection) where feasible in MVP; may start as a simpler heuristic if full detection isn't feasible for v1
- Each parameter scored 1–10; composite score is a simple average, displayed to the user alongside the entry
- Scoring model is explicitly a simplified v1 — not the final trained/weighted version

### 6.5 Journal (Personal Archive)
- Chronological list/grid view of all saved entries
- Each entry displays photo, score, date, and story (if present)
- Entries are private by default
- User can open an entry to view full detail (photo, full story, score breakdown by parameter)

### 6.6 Sharing (Share-Out, MVP)
- From an entry, user can trigger a "Share" action
- Share generates a shareable image/card containing: the photo, the composite score, and the story (if present)
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

## 7. Screens (MVP)

1. **Onboarding / Login** — account creation, brief intro to the concept
2. **Home / Capture** — camera or photo picker entry point
3. **New Entry** — add story/caption, confirm/edit location, save
4. **Score Result** — shows composite score + four-parameter breakdown after save
5. **Journal** — chronological grid/list of all saved entries
6. **Entry Detail** — full photo, story, score breakdown, share action, "post to map" action
7. **Live Map** — global map view of public posted entries, tap a pin to view detail
8. **Settings** — account, notification preferences

## 8. Out of Scope for MVP

- Public story feed
- In-app friend circle / social graph (sharing is share-out only)
- Community/audience voting on entries or on map retention
- Weighted or fully trained scoring algorithm
- Physical products, brand partnerships, or any monetization features
- Real-time "sunset happening now" map behavior

## 9. Open Questions / Dependencies

- [ ] Exact retention window and score threshold logic for the Live Map (currently placeholder values)
- [ ] Login method (email vs. phone vs. social)
- [ ] Feasibility of "Wow Factor" phenomenon detection at MVP quality/budget — may need to simplify further
- [ ] Location precision/privacy approach for map pins (general area vs. exact point)
- [ ] Platform priority — iOS first, Android first, or simultaneous
