# Sunset Soul — Build Spec: Phase 4f, Sunsets Together and November 22 updates
**Status:** Ready to build · **Date:** November 22, 2026 · **Decided by:** Louise (product), designed with Claude
**For:** Steve, or Claude Code working in this repo

This spec builds on Phase 4e (`sunset-soul-build-spec-flow-fixes.md`, already built). Part 1 lists small changes to screens that already exist. Part 2 adds **Sunsets Together**, the people feature. It doesn't add Live Map, Settings, or anything on the Later List.

**Designs and references**
- **Screen designs** (Dark mode and Light mode pages; new screens are in the row **Journey D · Sunsets Together**): https://claude.ai/artifact/XCsz8MDaV7vdQPb6UM5Wd2
- **Screen pictures in this repo:** [`design/screens/`](design/screens/README.md) (pictures 17–26 are new; 03, 04, 05, 08, 10, 11, 12 and 13 are updated)
- **Requirements:** PRD section 6.10 (`sunset-soul-prd.md`), plus 6.2, 6.4a, 6.4b, 6.5, 6.6, 6.7, 6.9
- **Why each decision was made:** `sunset-soul-flow-fixes-decisions.md`, section 9
- The designs use the design system's sample photos, which don't show people. Names ("Steve", "Maria") and memories are examples.

---

## Principles (in addition to Phase 4e)
1. **The AI notices people; the user names them.** No face recognition or face fingerprints, ever. The AI only answers "are there people in this photo, and roughly how many?"
2. **Private until you share it.** Names, recordings and friends' memories are seen only by the owner unless the owner shares them.
3. **Sharing one sunset is the default.** Sharing a set of sunsets is always a separate, deliberate choice.
4. **No extra steps unless they apply.** New steps (Before you share, Who's in this one?) appear only when there's something to ask.

---

## Part 1 · Changes to existing screens

### 1.1 Voice privacy wording (B3b, B3d, B4)
| Where | Old | New |
|---|---|---|
| Microphone note, first time (B3b) | "Your recording stays private. Friends never hear it." | **"Your recording is private. You decide if friends hear it."** |
| Recording row, story review and Edit (B3d) | "0:48 · Only you can hear it" | **"0:48 · Private until you share it"** |
| Note at the bottom of story review (B3d) | "…Your recording stays private; your story is shared only if you share it." | **"AI turned your recording into text and suggested the title. Your recording and story stay private until you share them."** |
| Entry Detail recording row (B4) | "Hear it in your own voice · 0:48" + "Only you can hear it" | **"Hear it in your own voice"** · **"0:48 · Private until you share it"** |

### 1.2 Afterglow becomes "From your friends" (B4, B6)
- Screen title: **"From your friends"** (remove the small "from your friends" line under it). Route can stay `/journal/[id]/afterglow`; "Afterglow" is the team's internal name only and never appears in the app.
- Entry Detail row: label **"See what friends sent"** (Fraunces 21px) with the status on a **second line** underneath (`caption`, `ink-muted`): "Shared · 4 reactions", "Shared · 4 reactions · 2 memories", "No reactions yet", or "Not shared yet". Chevron on the right. Two lines so it never wraps at large text sizes.
- After Stop sharing, the second line reads "Not shared".

### 1.3 Journal (B1)
- Switch label: **Stories · Photos** (was "Stories · All photos"). Route `/journal?view=photos` unchanged.
- New filter under the switch, same pill style as the switch: **All · With people · Pure sunset** (column widths 0.8fr · 1.2fr · 1.2fr). Opens on **Stories** and **All**. Works in both views. Remember the last choice with the last view.
- "With people" = the people check says yes **or** the entry has names (2.1). "Pure sunset" = neither.

### 1.4 New sunset, choose a photo (B2a)
- Intro: "Add one you've already taken, or one you're watching now."
- **Choose from your photos** comes **first** ("A sunset you've already taken"); **Take a photo** second ("Opens the camera. The photo is saved in your Journal.").
- No "Save to your photos" step after taking a photo (a web app can't save to the photo library on its own; tried and dropped as too slow). Saving to the phone automatically is on the Later List for a native app.

### 1.5 Wow scoring rule for people (scoring prompt and calibration)
- Add to the Wow instructions: never judge anyone's appearance; a dark or backlit face never lowers a score; a silhouetted figure can add drama (driver 4), but people in a photo don't raise the score by themselves; a plain selfie with an ordinary sky scores like an ordinary sky.
- Add photos with people (silhouettes, couples, groups, selfies) to the calibration set and re-run the reference test.

---

## Part 2 · Sunsets Together (new)

### 2.0 Data (suggestions; adjust to the existing schema)
- **People check:** add to `entries` (or `entry_scores`) `has_people boolean` and `people_count smallint`, filled by the same AI call that writes the Wow line. Never identifies anyone. Hidden from the user.
- **Names:** `entry_people (entry_id, user_id, name, created_at)`; distinct names per user give the chips. Names are owner-only.
- **Personal links:** today `shares` is one row per entry (`entry_id` is unique). Add `share_recipients (id, share_id, name, token, created_at)`; the personal link is `/s/[share id]?r=[token]` or `/s/[token]`. "Someone else" keeps the normal link.
- **Include my voice:** `shares.include_voice boolean default false` (and the same on share sets). Turning it off, or deleting the recording, removes it from the Share Page.
- **Shared sets:** `share_sets (id, user_id, person_name, include_voice, created_at)` and `share_set_entries (set_id, entry_id, position)`. Reactions on a set attach to the set, not to each entry.
- **Friends' memories:** `memories (id, share_id or set_id, visitor_id, name, text, r2_key, content_type, duration_ms, transcript, created_at)`. Reuse the `story_clips` upload, storage and speech-to-text pieces. Spoken memories up to **1 minute**. Owner-only; owner can remove.
- **Optional (only if cheap):** save a photo "fingerprint" (image embedding) and a story fingerprint at save, for Finding Your Sunsets in Phase 2. Nobody sees it in the MVP.

### 2.1 Story screen: "Who's in this one?" (D1, picture 17) — `/journal/[id]/story`
- Shown only when the people check says yes. Optional; never blocks Save.
- A `surface-raised` card under the story box: people icon · **Who's in this one?** (Fraunces 22px) · "It looks like there are people in this photo. Add their names if you like. Only you see them."
- Name chips (pills, 48px): names used before by this user, most recent first. Tapped = peach blush fill + checkmark.
- **Add a name** field + square **+** button. A new name becomes a chip.
- Helper: "Names you've used before appear here, so you can tap instead of typing."
- Names can be changed in Edit later.

### 2.2 Journal, With people (D2, picture 18) — `/journal?show=people`
- Same as Stories, with **With people** selected in the filter.
- Under the filter: "Tap a name to see your sunsets together", then name chips with counts ("Steve 12", "The grandkids 5"). Tap → Sunsets with [Name].
- Story cards gain a line under the title: people icon · "With Steve".

### 2.3 Sunsets with [Name] (D3, picture 19) — `/journal/people/[name]`
- Header (Back "Journal" · New sunset) and bottom bar.
- Title "Sunsets with Steve" · "12 sunsets together, since March 2024".
- Main button: **Send Steve all your sunsets together** (share icon). Under it: "Sends one link with your sunsets together. You can leave any out first. To share just one sunset, open it and tap Share."
- Inset photo cards (photo, date and place, title, two lines of story), newest first. Tap → Entry Detail.

### 2.4 Share the set, review (D4, picture 20)
- No bar. Top left: **Cancel**.
- Title "Share with Steve" · "Uncheck any you'd rather not send."
- Rows: thumbnail, title, date, checkbox on the right. **All checked to start.**
- **Include my voice** switch (off by default): "On sunsets where you told the story out loud".
- "11 of 12 selected" · main button **Share 11 sunsets** → creates the set and opens the phone's share menu.
- Note: "Next, your phone's share menu opens. Steve's link says "Steve, Louise shared 11 sunsets with you." You can stop sharing any time."

### 2.5 Share Page, a set (D5, picture 21) — friends, no app
- "**Steve**, Louise shared 11 sunsets with you" · title "Our sunsets together" · date range.
- The sunsets in a scrolling list (photo inset, date and place, title, full story; "Hear Louise tell it" on any with voice included).
- **One set of reactions:** "Let Louise know you saw them" · "One reply for the whole set. Tap one or more." Four reactions ("I was there!" for the named person), note box, **Send**. Footer as the single Share Page.

### 2.6 Entry Detail with names and memories (D6, picture 22)
Order: header → photo full bleed → title → date and place → **"With" + name chips** (tap → Sunsets with [Name]) → Wow line → story → recording row → Edit → **Their side of the story** (memory cards, 2.9) → **Share** → **See what friends sent** row → Score details → Delete → bottom bar.

### 2.7 Before you share (D7, picture 23)
- Appears after tapping **Share** only if the photo has names **or** the story was spoken. Otherwise the share menu opens right away, as today.
- No bar. Top left: **Cancel**. Title "Before you share", small photo and title.
- **Who are you sending this to?** (only if the photo has names): "Steve is in this photo. Pick him and his link will say he's in it." Radio rows: each named person ("Steve, you're in Louise's sunset") and **Someone else** ("Louise shared a sunset with you"). Pre-select the first named person.
- **Include my voice** switch (only if spoken), **off by default**: "Let Steve hear you tell this story (0:48). Off unless you turn it on."
- Main button **Share** → creates the link (personal or normal) and opens the phone's share menu. Note: "Next, your phone's share menu opens. This step only appears when a photo has names or a spoken story."
- Only this one sunset is sent. This screen never leads to Sunsets with [Name].

### 2.8 Share Page changes (D8 and D9, pictures 24 and 25) — `/s/[id]`
- **Personal link (D8):** top line "**Steve**, you're in Louise's sunset". No first-name prompt (the name is known). Reaction 2 reads **I was there!** (same `wish` key, same horizon icon; label only).
- **Voice (both):** if included, a play row under the title and date: "Hear Louise tell it · 0:48".
- **Add your side of the story (both):** a `surface-raised` card after the note box.
  - Heading: personal link "Add your side of the story"; normal link "Were you there? Add your side of the story."
  - Line: "What do you remember about this night? Only Louise will read or hear it." (normal link: "Or share a memory it brings back. Only Louise will read or hear it.")
  - Two-way switch **Type it · Say it**.
  - Type it: a text box (limit about 500 characters; open question).
  - Say it: record in the browser (asks for the microphone once), up to **1:00**. After recording: "Your memory · 0:41 of 1:00", play, **Record again**, then the words in an editable box ("Here are your words. Change anything you like.").
  - If the browser can't record (in-app browsers in Facebook, Instagram and some messaging apps; older phones), hide Say it and show only typing, with: "Saying it works for up to 1 minute. If your phone can't record here, you can still type."
- **One Send button** at the bottom sends reactions, note and memory together. Under it: "Sending as Steve. Only Louise sees your note and memory."
- Every friend the sunset is sent to can add a memory (normal and personal links).

### 2.9 From your friends, with memories (D10, picture 26) — `/journal/[id]/afterglow`
- Title "From your friends", small photo and title, four reaction tiles (label "I was there!" counts with Wish I was there; note under the tiles: ""I was there!" comes from people in the photo. Others see "Wish I was there"").
- **Their side of the story:** memory cards, newest first: "Steve's memory" · (if spoken) play "Hear Steve tell it" · "0:41 · Private to you" · the words in quotes · "Spoken, written down by AI" or "Written" · **Remove**.
- Reactions and notes list, **Share again**, link settings (unchanged).

### 2.10 Privacy rules (build-time checks)
- No face recognition; the Wow line never names people.
- Names, memories and recordings are owner-only unless shared as above.
- Public map (later phase): photos with people stay off by default; photos of children are never allowed.

---

## States to build (described, not drawn)
- Before sharing, the Entry Detail row's second line reads "Not shared yet".
- Friend's microphone denied or unavailable on the Share Page: only Type it shows.
- Friend's memory sent: the card is replaced by "Sent! Louise will see your memory." (alongside the reactions thank-you).
- A memory upload fails: keep the typed words and the recording on the page, with "Couldn't send. Try again."
- Owner deletes their recording: Include my voice turns off and "Hear Louise tell it" disappears from any Share Page.
- Stop sharing a set: the set link shows the dead-link message (Later List) or a simple "This link is no longer shared."

## Copy changes at a glance
| Where | New text |
|---|---|
| Microphone note | "Your recording is private. You decide if friends hear it." |
| Recording rows | "0:48 · Private until you share it" |
| Story review note | "Your recording and story stay private until you share them." |
| Friends' memories | "0:41 · Private to you" |
| Reactions screen title | "From your friends" |
| Entry Detail row | "See what friends sent" / "Shared · 4 reactions · 2 memories" |
| Journal switch | "Stories · Photos" |
| Journal filter | "All · With people · Pure sunset" |
| New sunset choices | "Choose from your photos" (first), "Take a photo" ("Opens the camera. The photo is saved in your Journal.") |
| Sunsets with [Name] button | "Send Steve all your sunsets together" |
| Personal link | "Steve, you're in Louise's sunset" · "I was there!" |
| Memory card on Share Page | "Were you there? Add your side of the story." · "Type it" · "Say it" |

## Suggested build order
1. **Part 1 copy and labels** (1.1–1.4): quick wins, no data changes.
2. **People check + names** (2.0, 2.1) and the **Journal filter** (1.3, 2.2).
3. **Before you share + personal links + I was there!** (2.7, 2.8 personal).
4. **Include my voice** (2.7, 2.8 voice).
5. **Two sides of the story**: typed first, then spoken (2.8, 2.6, 2.9).
6. **Sunsets with [Name] and shared sets** (2.3–2.5).
7. **Scoring rule and calibration** (1.5).

## Done when
- A user saves a photo with people, adds "Steve" with one tap the second time, and sees it under "With people" and in Sunsets with Steve.
- Sharing a photo with Steve in it asks who it's for; Steve's link greets him by name, offers "I was there!", and lets him say his side in up to a minute from his phone's browser, with no app or account.
- The owner hears Steve's memory on Entry Detail and From your friends; nobody else can.
- A user sends Steve all their sunsets together, leaving one out, and Steve replies once for the set.
- "Only you can hear it", "Afterglow" and "All photos" appear nowhere in the app.
