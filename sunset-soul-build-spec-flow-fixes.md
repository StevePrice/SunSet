# Sunset Soul — Build Spec: Phase 4e, MVP Flow Fixes
**Status:** Ready to build · **Date:** November 8, 2026 · **Decided by:** Louise (product), designed with Claude
**For:** Steve, or Claude Code working in this repo

This spec turns the November 8 design review into build instructions. It fixes the flow of the screens that are already built and adds voice storytelling. It doesn't add Live Map, Settings or reminders (see `sunset-soul-later-list.md`).

**Designs and references**
- **Screen designs** (every screen, Dark mode and Light mode pages): https://claude.ai/artifact/XCsz8MDaV7vdQPb6UM5Wd2
- **Screen pictures in this repo** (every screen, dark and light, one picture each, with the Build Spec section for each): [`design/screens/`](design/screens/README.md)
- **Flow map** (three journeys, what changed on each screen): https://claude.ai/artifact/4DfUMuiEysmM7yLrGySPsV
- **Design system** (brand book, tokens, component guidelines): https://claude.ai/artifact/PFq9iBSY5vUT7hxG5ymNaD and `design-system/` in this repo
- Both links are private to Louise until she shares them. The board names below match the canvas (B1, B3a and so on).
- The designs use the design system's sample photos with Louise's real stories, so some photos don't match their story. Titles like "Lone Trees After the Fire", the Wow lines and the friend "Maria" are examples.

**Why each decision was made:** `sunset-soul-flow-fixes-decisions.md`.

**Where the PRDs changed:** `sunset-soul-prd.md` (6.1, 6.3, 6.4a, 6.5, 6.6, 6.9, 7) and `sunset-soul-prd-story-capture.md` (6.1–6.4, 6.7, 7, 8) are updated in this pull request to match this spec.

---

## 1. Principles behind every change
1. **The photo and the story lead; the score is a quiet detail.** Nothing is ever drawn on a person's photo inside the app or on images that leave it, except the logo mark on shared images.
2. **One main button per screen** (the `action` color). Everything else is secondary or a text link.
3. **Typing first, speaking right below.** The AI helps only when asked.
4. **Every screen works for readers aged 50–65:** 18pt body, nothing under 15pt, tap targets at least 48pt, words under every icon, nothing that relies on color alone.
5. **Nothing is ever lost.** A sunset is saved before any AI step; every AI step can fail without losing work.

---

## 2. App-wide changes

### 2.1 Header and bottom bar (replaces the "Account" link at the bottom of the Journal)
- **Header, on Journal (both views and empty), Entry Detail, Afterglow and You:**
  - Left: the horizontal logo, **36px tall** (Journal and You). On Entry Detail and Afterglow the left side is a **Back** link instead (chevron + "Journal" or "Back").
  - Right: a **New sunset** button: secondary pill (`surface-raised`, 1.5px `border-subtle`, `ink` text, 48px tall), camera icon + the words "New sunset". Goes to New sunset (B2). This is the only place to start a new sunset.
- **Bottom bar, on the same screens:** two tabs, **Journal** (grid icon) and **You** (person icon), each with its word under the icon. Current tab in `ink` and bold; the other in `ink-muted`. `divider` line on top, `surface-page` background, fixed to the bottom of the screen, plus the phone's safe area.
- **No bar and no header button** on: Welcome, New sunset, the story screens, the microphone note, recording. These keep Back or Cancel at the top. **Never** on the Share Page.
- When Live Map ships the bar becomes Journal · Map · You. New sunset stays in the header.

### 2.2 Copyright footer
Keep the existing **"© 2026 Sunset Soul. All rights reserved."** line (PRD 7). It isn't drawn in the designs. On screens with the bottom bar, put it at the end of the scrolling content, above the bar.

### 2.3 Light and dark mode
Dark is the brand default; light follows the phone's setting. Every screen has a light twin on the canvas's **Light mode** page. Build from the tokens, not hex values. Two light-mode specifics:
- The recording line (B3c) is `reaction-selected` in dark mode and `action` in light mode (peach blush nearly disappears on cream).
- The light logo files (`…-for-light.svg`) on cream.

### 2.4 Score: only in Score details
Remove the score from: photos in the Journal (both views), Entry Detail's photo, the Share Page, share images (link-preview card and Stories card), and Afterglow. The score badge appears in **one** place: the Score details row on Entry Detail (owner only). See 3.6.

### 2.5 Dates and place names
- **Date bug:** the Share Page showed August 21 for an entry the Journal shows as August 22. The Journal formats in the viewer's time zone (`LocalDate`); the Share Page uses `formatTakenAt` on the server. Use one rule everywhere: the date in the **owner's** time zone when the photo was taken (store the owner's time zone with the entry if it isn't already).
- **Place names in one form** everywhere: "Carlsbad, California", not sometimes "Carlsbad".

### 2.6 Titles
Every entry has a title. Entries without one (for example, the August 22 Sierra entry on staging) get an AI-suggested title, filled in once for existing entries.

---

## 3. Screen by screen

### 3.1 Welcome / first name (new · board "A · Your first name") — route suggestion `/welcome`
Shown once, after the first sign-in, when the account has no first name (accounts made by email link today have none, which is why the Share Page says "A sunset shared with you").
- Logo (36px) · **Welcome to Sunset Soul** (`display`) · *"Your sunsets, your stories, shared with family and friends."* (`story`)
- Divider · **What's your first name?** (`title-2`) · "Friends see it when you share a sunset."
- Preview card (`surface-sunken`): "What friends will see" · "**[Name]** shared a sunset with you" (updates as they type)
- **First name** field (`autocomplete="given-name"`) · "You can change it later in your account."
- **Continue** (main button) → the Journal (empty state for new users).
- Also used by friends who tap "Start your own Journal" on a Share Page, after they sign up.

### 3.2 Journal, Stories (changed · B1) — `/journal`
- Header and bottom bar (2.1). Title "Your Journal". The Stories | All photos switch under it (unchanged look).
- Cards: inset photo with **nothing on it**, then date and place (`caption`, `ink-muted`), title (`title-3`), first three lines of the story, and for shared entries **"Shared · 4 reactions"** (`caption`, `ink-muted`). Whole card opens Entry Detail.
- **Remember the last view** (Stories or All photos) for this person, and open in it next time.

### 3.3 Journal, All photos (changed · B1) — `/journal?view=photos`
- Header and bottom bar. Title "Your Journal" with the count to its right ("15 sunsets", `caption`, `ink-muted`). Switch set to All photos.
- Month headings (`overline`, e.g. "NOVEMBER 2026"), then **two columns** of square photos, 8px apart, `radius-sm`, photos only. Tap opens Entry Detail.

### 3.4 Journal, empty (changed · board "A · Journal, empty")
- Header and bottom bar. Title "Your Journal".
- `surface-sunken` card: logo mark · **No sunsets yet** · "The next time one stops you in your tracks, save it here with the story behind it." · **Save your first sunset** (main button → New sunset) · "A photo you took earlier works too."

### 3.5 New sunset (changed · B2a and B2b) — `/journal/new`
Every **New sunset** button (header, empty Journal) opens step one.

**B2a · Choose a photo (first step):**
- **Cancel** at top left (back to where they came from). No header button, no bottom bar.
- **New sunset** (`title-1`) · "Add one you're watching now, or one you took earlier."
- Two large cards (`surface-raised`, `border-subtle`, 112px tall, whole card tappable), each with a 64px round icon, a `title-3` label and a `caption` line:
  - **Take a photo** · "Opens your camera" (camera input, `capture="environment"`)
  - **Choose from your photos** · "A sunset you took earlier" (photo library input)
- A `surface-sunken` note: "Older photos keep the date and place they were taken, so they land in the right spot in your Journal. You can change either one."
- No main button on this screen; the two cards are the choice.

**B2b · Photo chosen:**
- **Cancel** at top left. The photo inset, a **Choose a different photo** link (back to B2a), and a card with **Date taken** and **Place** rows, each with **Change**.
- **Add your story** (main button): **saves the entry first**, then opens the story screen (B3a). Same as today's "Save and tell its story", renamed.
- **Save for now** (text link): saves and opens Entry Detail. "You can add a story any time."
- **Remove** the story box from this screen.

### 3.6 Entry Detail (changed · B4) — `/journal/[id]`
Top to bottom:
1. Header: **Back** ("Journal") · **New sunset**.
2. **Photo, full bleed**, nothing on it.
3. **Title** (`title-2`), then **date and place** (`caption`, `ink-muted`).
4. **Wow line** (`caption`, `ink-muted`): the scorer's one-line reason. While scoring: "Scoring…" in the same spot.
5. **Story** (`story`). No story yet: an **Add your story** button (secondary) instead.
6. If the story was spoken: a row **"Hear it in your own voice · 0:48"** with a play button and "Only you can hear it". Owner only.
7. **Edit** (text link with a pencil icon) → the story screen in edit mode (3.8).
8. **Share** (the main button). See 3.10.
9. **Afterglow row** (`surface-raised` card): "Afterglow" · "No reactions yet" or "Shared · 4 reactions" · chevron → Afterglow.
10. **Score details row**, closed by default: "Score details" · the apricot `ScoreBadge` (e.g. "78") · chevron. Tap to open (B4 · Score details, opened): "78 out of 100, the average of four parts. Only you see this." · four bars (Palette, Reach, Setting, Wow Factor, apricot fill on a `surface-page` track, number on the right) · the Setting and Wow reasons · "Palette and Reach are measured from your photo's colors. Setting and Wow Factor are judged by AI."
11. **Delete this sunset** (quiet text link). Keep today's confirmation.
12. Copyright line, then the bottom bar.

**Remove from this screen:** the always-open share-link panel (URL box, More…, Copy link, place name, Stop sharing), "Edit the story", "Tell its story", "Add more to my story" and "What you wrote" (these move into Edit).

### 3.7 Story, ready (changed · B3a) — `/journal/[id]/story`
- **Back** at top left. No header button, no bottom bar.
- Small photo thumbnail with date and place.
- Heading **The story behind this moment** (`title-1`).
- **Typing box first:** large (about 240px tall), `story` font, placeholder *"Where were you, and what made you stop to take this?"*
- **Need ideas?** link (lightbulb icon) under the box → opens **Story ideas** (3.9). Closed by default.
- **Voice panel** below (`surface-sunken` card): a 64px round microphone button (secondary style: `surface-raised`, `border-subtle`, not the action color) · **Rather talk than type?** · "Tell it in your own voice. We'll write it down, and you can hear it again later."
- **Save** (main button) · "Not ready? Save now and add your story any time." Saving with an empty box returns to Entry Detail with no story.
- **Removed:** the three opening questions shown up front, the interview-first flow, "Keep going" and "That's my story" as the main path, and the "Caption for sharing" field.

### 3.8 Microphone note, recording, and review (new · B3b, B3c, B3d)
**First tap on the microphone (B3b), once per person:**
- A bottom sheet over a dimmed screen (navy shade, so the sheet clearly sits on top): mic icon · **Tell it in your own voice** · "Your phone will ask if Sunset Soul can use the microphone. Tap Allow." · "Your recording stays private. Friends never hear it." · "AI turns what you say into text you can change." · **Continue** (main button → the browser's microphone prompt, then recording) · **Type instead** (text link, closes the sheet).
- If the person denies the microphone: a plain sentence on the story screen ("Sunset Soul can't use your microphone. You can type your story instead, or allow the microphone in your phone's settings."), and the typing box stays ready.

**Recording (B3c):**
- **Cancel** at top left. "LISTENING" (`overline`), a running timer ("0:42", 40px, tabular numbers), a gentle moving line, a 96px **Stop** button (`action`, square stop icon) · "Tap to stop" · "Take your time. Pauses are fine. Up to 2 minutes." · "When you stop, your words appear so you can read and change them."
- At 2 minutes, recording stops on its own.

**Review, and Edit (B3d):** the same screen serves both "after speaking" and Edit from Entry Detail.
- **Your recording** row: play button · "Your recording" · "0:48 · Only you can hear it" · **Add more** (records again and appends).
- **Delete recording (your words stay)** (quiet text link with a trash icon): deletes the audio only; the written story stays. Confirm first.
- "Here are your words. Change anything you like." then the box with the transcript ("What you said": filler words removed, otherwise unchanged).
- **Need ideas?** (closed) and **Help me polish it** (appears once there are words) → today's My story / Crafted story and length options, unchanged inside.
- **Title** field, AI-suggested: "Suggested from your photo and story. Change it if you like."
- **Save** (main button).
- Note: "AI turned your recording into text and suggested the title. Your recording stays private; your story is shared only if you share it."
- **Reuse** the recording, storage, Whisper transcription and playback work on the `phase-5-voice-settings` branch. Only the screens around it change.
- Typed stories: same screen without the recording row; "What you wrote" is the original text.

### 3.9 Story ideas (changed)
- Opened by **Need ideas?** A `surface-sunken` panel: **Story ideas** · close button · "Tap one to keep it above your story while you write." · three questions picked for this photo, as full-width secondary buttons · **More ideas** link (a new set).
- Tapping a question shows it **above the box** as a nudge; it is not typed into the box.
- Uses today's opening-question generation; fixed general questions if the photo can't be analyzed.

### 3.10 Share (changed)
- **Share** on Entry Detail creates the link if there isn't one, then opens the phone's share menu (Web Share) with the link and the share image. No panel first.
- The link settings move into **Afterglow** (3.11).
- Share images (link preview and Stories card): **remove the score badge**. Only the logo mark stays, top-left on its translucent navy square.

### 3.11 Afterglow (changed · B6) — `/journal/[id]/afterglow`
- Header: **Back** · **New sunset**. Bottom bar.
- **Afterglow** · "from your friends" · small photo and title.
- **Four totals** in a two-by-two grid (icon, word, count): Wow, Wish I was there, Love this!, **Sending hugs**.
- People list: name · their reactions · note in `story` font · **Remove** link (as today).
- **Share again** (main button).
- **Link settings** card: "Anyone with the link can see the photo, title, story and date, and react. The exact location is never shared." · **Copy link** (secondary) · **Place name friends see** field (filled from the entry's place) · **Stop sharing** (text link).
- After Stop sharing, the Entry Detail row reads "Afterglow · Not shared" and the old link stops working.

### 3.12 Share Page (changed · C) — `/s/[id]`, friends, no app
1. "**[Name]** shared a sunset with you" (uses the first name from 3.1).
2. Photo, inset, nothing on it.
3. **Title** (`title-2`, new here), date and place, then the story.
4. Divider, then **Let [Name] know you saw it** (`title-3`) · "Tap one or more, and add a note if you like."
5. **Four reactions** in **two rows of two**: Wow · Wish I was there · Love this! · **Sending hugs**. Each: line icon, word, count.
6. **Tapped reaction:** `reaction-selected` fill, `reaction-selected-border`, `on-reaction` text, a **checkmark beside the count** (never color alone), and one short icon animation (rays spread, horizon glows, heart beats, arms open wide), skipped under reduced motion. Tap again to undo.
7. First tap: ask for the friend's first name (as today). Then the note field "Add a note for [Name] (optional)", **Send** (main button), and "Reacting as [friend]. Only [Name] sees your name and note."
8. After Send: "Sent! [Name] will see your reaction." (as today).
9. Footer: "Shared from" + logo · "A place to keep the sunsets that move you, and the stories behind them." · **Start your own Journal** (text link) · copyright.
- **Remove:** the score card and breakdown.

### 3.13 You (changed · "Account") — `/account`
- Header (logo · New sunset) and bottom bar (You selected). Title "Your account".
- **First name** field: "Friends see this when you share a sunset." The **Save** button appears only after the name changes.
- "Signed in as" card with the email. **Sign out** (secondary) at the bottom.

---

## 4. Reactions: data and icons
- Add **Sending hugs** as a fourth kind. Today: `REACTION_KINDS = ["wow", "wish", "love"]` in `apps/web/src/lib/reaction-input.ts`. Suggested key: `hugs`, label "Sending hugs". Update counts, Afterglow totals, the reaction indicator and any tests.
- **Icons** (24px, 1.8px stroke, rounded ends, `currentColor`). These replace the sparkle / map pin / heart proposed in Phase 4d. SVG paths as drawn on the canvas:
  - **Wow** (sun with rays): `<circle cx="12" cy="12" r="3.6"/>` + `M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M5.5 18.5l2.1-2.1M16.4 7.6l2.1-2.1`
  - **Wish I was there** (horizon): `M2.5 16.5h19M6.5 16.5a5.5 5.5 0 0 1 11 0M8 20h8`
  - **Love this!** (heart): `M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z`
  - **Sending hugs** (person with open arms): `<circle cx="12" cy="5.5" r="2.4"/>` + `M12 9.5v6M3.5 8.5c3 2.3 5.6 3 8.5 3s5.5-.7 8.5-3M12 15.5l-3 5M12 15.5l3 5`
  - Checkmark (tapped): `M5 12.5l4.5 4.5L19 7.5`, 18px, 2.2px stroke.

---

## 5. States to build (described here, not drawn)
- **Scoring…** in the Wow line spot on Entry Detail until the score arrives; the Score details row shows "Scoring…" instead of the badge.
- **Scoring failed / not a sunset / daily limit:** keep today's messages, inside the Score details row.
- **No connection, or the photo won't upload** (New sunset): "Couldn't save your sunset. Check your connection and try again." The photo stays on screen.
- **AI unavailable** (story ideas, polish, title, transcription): "Story help isn't available right now. Your words are saved." The recording is always kept; the person can type instead or try again later.
- **Microphone denied:** see 3.8.
- **Friend's first-name prompt** and **"Sent!"** on the Share Page: as today, restyled.
- **After Stop sharing:** see 3.11.

---

## 6. Copy changes at a glance
| Where | Old | New |
|---|---|---|
| New sunset | Save and tell its story | **Add your story** |
| New sunset | Save to my Journal | **Save for now** (link) |
| Entry Detail | Tell its story / Edit the story / Add more to my story | **Add your story** (no story) or **Edit** |
| Entry Detail | More… / Copy link panel | **Share** (button) |
| Story | Tell its story | **The story behind this moment** |
| Story | Pick a question, or just start telling it. | Typing box with *"Where were you, and what made you stop to take this?"* · **Need ideas?** |
| Story | Caption for sharing | (removed) |
| Share Page | A sunset shared with you | **[Name] shared a sunset with you** |
| Share Page | How did this sunset make you feel? | **Let [Name] know you saw it** |
| Share Page | Tap a reaction to let [Name] know. | **Tap one or more, and add a note if you like.** |
| Journal | Account (link) | **You** (bottom bar) |
| Afterglow row | No reactions yet → | "No reactions yet", "Shared · 4 reactions", or "Not shared" |

---

## 7. Suggested build order
1. **Navigation and name:** header + bottom bar (2.1), Welcome / first name (3.1), You (3.13). Unblocks the Share Page name.
2. **Entry Detail and sharing:** new order, Score details, Share button, Afterglow with link settings (3.6, 3.10, 3.11), score off share images (2.4).
3. **Share Page and reactions:** Sending hugs, icons, checkmark, invitation copy, two-by-two layout (3.12, 4).
4. **Story flow:** typing first, Story ideas, voice panel and the three voice screens, merged with `phase-5-voice-settings` (3.7–3.9).
5. **Journal tidy-up:** Stories and All photos (3.2, 3.3), empty state (3.4), New sunset (3.5), remember last view.
6. **Fixes:** date rule and place names (2.5), title backfill (2.6), light-mode pass against the Light mode page (2.3).

## 8. Done when
- On a phone, a new user signs in, gives a first name, saves a sunset, adds a story by typing **and** by speaking, and shares it with one tap.
- A friend opens the link without an account, sees "[Name] shared a sunset with you", the title and story (no score), taps Sending hugs (checkmark visible) and sends a note; the sender sees it in Afterglow.
- No photo or shared image shows a score; the score appears only in Score details.
- Dates match between the Journal and the Share Page for the same entry.
- Every screen matches its board on both the Dark mode and Light mode pages, and nothing is under 15pt or smaller than a 48pt tap target.
