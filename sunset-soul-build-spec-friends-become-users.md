# Sunset Soul — Build Spec: Phase 4g, Friends Become Users
**Status:** Approved by Steve, November 27, 2026, with the changes under "Decisions" · **Date:** November 24, 2026 · **Decided by:** Louise (product), designed with Claude
**For:** Steve, or Claude Code working in this repo
**Phase number:** Phase 4g (called "Release A" until November 27).

**Decisions (Steve, November 27, 2026).** These change the spec below where they disagree; the sections they touch are marked.
1. **Claim only what the link brings.** Claiming copies the sunsets of the link Steve opened: one sunset for a personal link (4f-3), every sunset in the set for a set link (4f-5, `/s/set/[id]`). No other sunsets are matched by first name, so two friends called Steve can't receive each other's sunsets. Louise sends someone all their sunsets at once with a set.
2. **Later links aren't copied automatically.** When Steve, signed in, opens a new link from Louise, the Share Page offers one tap, **Add to my Journal**, which copies it. (This replaces "go straight into his Journal" in 1.1 and the PRD's November 24 decision; Louise to confirm. "New from Louise" is not needed.)
3. **The safety check on a sunset sent back counts against Louise's daily AI limit,** like friends' recordings in 4f-4, on top of the 4-per-visitor-per-day cap.
4. **"Not Steve?"** writes an entry to the admin activity log.

This spec builds on Phase 4f (`sunset-soul-build-spec-sunsets-together.md`). It turns friends who *receive* sunsets into people who *keep* their own, in two parts: **Claim your sunsets** (someone in your sunsets starts a Journal with them already in it) and **Send Louise a sunset** (any friend replies with a sunset of their own). It doesn't add a friend list, the Family Circle, the Sunset Map or anything else on the Later List.

**Before starting:** Phase 4f-4, **Add to the story** (friends add to the story on the Share Page, typed or spoken), should be built first. This release copies what a friend added into their Journal and reuses its recording pieces. Please build 4f-4 with the new wording: see "Wording update" in [`design/screens/README.md`](design/screens/README.md).

**Designs and references**
- **Screen designs** (Dark mode and Light mode pages; new screens are in the row **Journey E · Friends become users**): https://claude.ai/artifact/XCsz8MDaV7vdQPb6UM5Wd2
- **Screen pictures in this repo:** [`design/screens/`](design/screens/README.md), pictures 27–37 (new) and 18, 22, 24–26 (redrawn with "Add to the story")
- **Requirements:** [`sunset-soul-prd-friends-become-users.md`](sunset-soul-prd-friends-become-users.md) (B1, B2, B3), plus MVP PRD 6.9, 6.10e and 6.10g (`sunset-soul-prd.md`)
- Names ("Louise", "Steve", "Maria", "Ana") and stories are examples. The sample photos don't show people; real ones would.

---

## Principles
1. **Friends can always react without the app.** Joining is a bonus, never a gate. Nothing on the Share Page requires an account.
2. **Invite at emotional moments, not with pop-ups.** No pop-ups or "Download our app!" banners. The invitations are the "you're in 8 of Louise's sunsets" line and the "Send Louise a sunset" card.
3. **The story travels with every sunset.** A sunset is never passed along as a bare photo: copies carry Louise's story, and a sunset sent back carries its story.
4. **A shared sunset is a copy.** Once it's in Steve's Journal, it's his. Louise can't take it back; Steve can delete it.
5. **Private until you share it.** Louise's exact location, the names she added, other friends' reactions and the score never leave her account.

---

## Part 1 · Data (suggestions; adjust to the existing schema)

### 1.1 Claiming (Steve joins from a personal link)
- **Carry the personal link through sign-up.** `/s/[id]/join` already sets `REF_COOKIE` and redirects to `/sign-in?mode=sign-up`. When the request has a valid `r` token, also set a short-lived, httpOnly **claim cookie** holding the share id and token (1 day, like `REF_COOKIE`). Sign-in by email link or password works as today.
- **Claim after sign-in.** When a signed-in user has a claim cookie, look up the `share_recipients` row by token, then copy that share's sunset (or, for a set link, every sunset in the set). *(Decision 1: no matching of other rows by name.)* Suggested columns on `share_recipients`: `claimed_user_id` (nullable) and `claimed_at`. Clear the cookie afterwards.
- **Existing accounts.** If Steve already has an account, the Share Page link reads "Add them to your Journal" and does the same claim after sign-in.
- **Later links.** *(Decision 2.)* When a signed-in user opens a link from Louise, the Share Page offers **Add to my Journal**, which makes the copy (1.2). Nothing is copied without that tap.

### 1.2 Copies in Steve's Journal
- **A copy is Steve's own entry.** Suggested columns on `entries`: `copied_from_entry_id` (nullable, `ON DELETE SET NULL` so the copy survives Louise deleting hers), `shared_by_user_id`, `shared_by_name`, `new_from_owner boolean`.
- **What's copied:** the photo, title, `taken_at`, `place_name`, `time_zone`, Louise's story text (read-only, shown as "Louise's story"), and Louise's recording only if **Include my voice** was on for Steve's link.
- **Photo and recording files:** copy the R2 objects (don't share keys), so Louise deleting her entry or recording can't remove Steve's. Copies are small.
- **General location only:** store the **town-level** point, for example the matching row in the `places` table, never Louise's exact location. That lets the copy appear on Steve's own Sunset Map later.
- **What Steve added:** the 4f-4 rows Steve sent on that share (matched through `share_recipients.visitor_id`) are copied onto his entry as **What you added**, including the recording if spoken.
- **Not copied:** Louise's exact location, `entry_people` names, other friends' reactions, notes and additions, and the score. **No new AI calls** for copies: the title is copied, there's no Score details on a copy, and no re-scoring.
- **Steve can** add his own story (the normal story field), add names, share his copy, and delete it. He can't edit Louise's story.

### 1.3 Notices for the owner
- `notices (id, user_id, kind, actor_name, count, entry_id, sent_back_id, created_at, dismissed_at)`, with `kind` one of `friend_joined` and `sent_back`.
- `friend_joined`: one notice per claim, with the number of sunsets copied.
- `sent_back`: one notice per sunset sent back (combined on the card if several arrive the same day).

### 1.4 Sunsets sent back (no account needed)
- `sent_backs (id, share_id, owner_user_id, visitor_id, name, photo_r2_key, story_text, clip_r2_key, clip_duration_ms, transcript, created_at, saved_entry_id, deleted_at)`.
- **Remove the location from the photo** before it's stored: re-encode the upload server-side without its metadata (EXIF, including GPS), and store only that copy. Never keep the original file.
- **Safety check:** run the scorer's existing "is this a sunset / is it safe" check (counts against Louise's daily AI limit, decision 3). If it fails, store nothing and show "This one couldn't be sent. Try a sunset photo." No title or Wow score yet (no AI cost until the friend joins).
- **Limit:** up to **4 per visitor per day** (a setting the team can change). After that: "You can send more tomorrow."
- **Story:** typed, or spoken up to **1 minute**, reusing the 4f-4 recording, upload and speech-to-text pieces. Typing only where the microphone isn't available.
- **Owner reactions:** `sent_back_reactions (sent_back_id, kind, created_at)` with the four existing reaction kinds. Steve sees them once he has a Journal.
- **Keeping it:** "Save it to my Journal" sets a claim-style cookie with the `sent_back` id. After sign-in, create Steve's first entry from it (photo, story, recording), then title and score it as a normal new sunset, and set `saved_entry_id`.
- If Louise deletes the sunset the friend replied to, the `sent_backs` row stays (it lives in **Sent to you**).

### 1.5 Emails (MVP PRD 6.9c look; `lib/email.ts`)
- Two new messages, sent with the existing `sendEmail`: **"Steve started his Journal with your sunsets"** and **"Steve sent you a sunset"** (screen 37).
- One email per event; several sunsets from the same friend on the same day are combined into one ("Steve sent you 3 sunsets").
- `users.friend_emails boolean default true`, and a signed **Turn off these emails** link in each email. (A switch in Settings comes when Settings exists.)

### 1.6 Analytics (PostHog)
- `claim_invite_shown`, `claim_completed` (with `sunsets_copied`), `copy_opened`, `send_back_started`, `send_back_sent`, `send_back_rejected`, `send_back_limit_hit`, `send_back_saved` (friend signed up from it), `owner_reacted_to_send_back`, `notice_dismissed`, `friend_email_sent`, `friend_emails_turned_off`.
- The PRD's main measure: the existing `share_signup_tapped` with `personal: true` vs. `false`, and `claim_completed`.

---

## Part 2 · Screens

### 2.1 Share Page after sending (E1, picture 27) — `/s/[id]`
- After the friend taps **Send**, the reactions area collapses to one line: a peach check and **"Sent! Louise will see your reaction and what you added to the story."** (or just "your reaction" if nothing was added), with a small **Change** link that reopens the reactions.
- **"Send Louise a sunset" card** (every Share Page, normal and personal links), right under that line:
  - Two tilted photo prints: Louise's photo captioned "Louise's", and an empty print with a plus sign and **"Your sunset"**. Decorative (`aria-hidden`).
  - Heading **"Send Louise a sunset"**, line **"With the story behind it."**
  - Main button **Choose a sunset photo** → 2.2. After Send, this is the page's one main (blue) button.
  - Small line: **"No account needed. Only Louise will see it."**
  - Card style: the usual card fill with a **peach outline** (`#F2B08E`), so it stands out from the rest of the page.
  - Before the friend sends their reactions, show the card lower and quieter (secondary button), so **Send** stays the one main button (design system rule).
- **Footer, personal links only:** heading **"Steve, you're in 8 of Louise's sunsets"** (count: the sunsets this link brings, decision 1; so on a personal link it's the one-sunset wording below, and on a set link the set's count), three small photos plus "+5", the line **"Start your own Journal and they'll be waiting for you."** and the text link **Start your own Journal** → `/s/[id]/join?r=[token]`. One sunset: **"Steve, you're in Louise's sunset … and it'll be waiting for you."** Normal links keep today's plain footer.

### 2.2 Send Louise a sunset (E2, picture 28) — new, `/s/[id]/send` (keep `?r=` on personal links)
- Back link **Louise's sunset**. Title **"Send Louise a sunset"**, line "Share a sunset you've seen lately, and the story behind it."
- The chosen photo (file picker opens straight away from 2.1; **Change photo** link under it).
- Card **"The story behind it"**: **Type it · Say it** switch (Type it first), a story box, and "Rather talk? Tap Say it and tell it in up to 1 minute."
- Button **Send to Louise**. Lines: "Sending as Steve. Only Louise will see it." and a lock icon with "We remove the photo's exact location before it's sent."
- First name: known from the personal link or an earlier reaction; otherwise the usual one-time name prompt.

### 2.3 Sent (E3, picture 29)
- Peach check, **"Sent!"**, "Louise will see your sunset and its story.", a small card with the photo and the story's first two lines.
- **"Want to keep this one?"** "Save it to your own Journal, with its story. You'll also see when Louise reacts."
- Button **Save it to my Journal** → sign-up (1.4, Keeping it). Link **Back to Louise's sunset**.

### 2.4 Welcome with the name filled in (E4, picture 30) — `/welcome`
- Same screen as today, plus a card under the tagline: one small photo and **"8 sunsets from Louise are coming with you."**
- First name filled in from the personal link ("Steve"); helper "We filled it in from Louise's link. Change it if you like."
- **Continue** → 2.5. Without a claim, the Welcome screen is unchanged.

### 2.5 Arrival (E5, picture 31) — new, right after Welcome
- Logo, **"8 sunsets with Louise are in your Journal"**, a 2×2 grid (three photos and "+5 more"), "Each one has Louise's story, and what you added to the story. They're yours to keep."
- Button **See your Journal**. Shown once.

### 2.6 Steve's Journal (E6, picture 32) — `/journal`
- Copies appear by date like any sunset, with a line **"Shared by Louise"** (small sunrise-arrow icon) under the title.
- Copies created after he joined also show a **"New from Louise"** tag until opened.
- The card's status line for a copy: **"Louise's story · What you added"** when he added something.

### 2.7 Entry Detail of a copy (E7, picture 33) — `/journal/[id]`
- Full photo, title, date and place, **Shared by Louise**.
- **Louise's story**: "Hear Louise tell it" (only if her voice was included for Steve) and her story text. Read-only.
- Card **What you added**: "Hear yourself tell it" (if spoken) and the text.
- **Add your own story** (opens the normal story screen; his story shows beside Louise's), note "Louise's story stays as she wrote it. Yours sits beside it."
- **Share** (main button) and **Delete from my Journal**. No Score details on copies.

### 2.8 Louise's Journal, notice cards (E8, picture 34) — `/journal`
- Cards at the top, above the Stories · Photos switch, newest first, each with a **Dismiss** (×) button:
  - **"Steve started his Journal with 8 of your sunsets together."** Links **Sunsets with Steve** (→ `/journal/people/Steve`) and a small **Not Steve?** (lets the team know; suggested: an entry in the admin activity log).
  - **"Steve sent you a sunset"** with the photo and **See it** → 2.9.
- Each of those sunsets' status line gains "Steve saved it".

### 2.9 From your friends, with a sunset sent back (E9, picture 35) — `/journal/[id]/afterglow`
- A line **"Steve saved this to his Journal"** (check icon) under the title.
- Section **"Steve sent one back"**: his photo, "Sent November 20 · Private to you", and his story (play button if spoken).
- **"Let Steve know you loved it"** with the four reactions (owner reacting; peach when chosen, with a check), and "Steve sees your reactions in his Journal."
- **Delete Steve's sunset** link.
- The rest of the screen (reaction totals, Added to the story, notes, link settings) is unchanged.

### 2.10 Sent to you (E10, picture 36) — new, `/account/sent-to-you`
- New row on the You screen: **Sent to you** (with a count when there are new ones). Not drawn; same row style as the You screen.
- Title **"Sent to you"**, line "Sunsets friends have sent back to you, newest first. Only you can see them."
- Each row: photo, friend's name, date and "for [title]" (or **"for a sunset you deleted"**), and the story's first two lines. Tapping opens the sunset (as in 2.9).

### 2.11 Emails (E11, picture 37)
- From Sunset Soul to Louise. Logo, **"Steve sent you a sunset"**, the photo at email size (MVP 6.9c), the story's first line, "In reply to your sunset [title]", button **See Steve's sunset**.
- Footer: "You're getting this because a friend sent you a sunset on Sunset Soul. One email per day, however many they send.", **Turn off these emails**, and the © line.
- "Steve started his Journal with your sunsets": the same layout with "Steve started his Journal with 8 of your sunsets together." and the button **See your sunsets**.

---

## States to build (described, not drawn)
- Claim link opened by someone already signed in as a different person: claim for the signed-in account only after a confirm ("Add Louise's 8 sunsets to your Journal?").
- Claim cookie expired or the shares were stopped: the Welcome screen shows normally; nothing is copied.
- A share stopped after Steve claimed: his copy stays.
- Send back failed upload: keep the photo and story on the page with "Couldn't send. Try again."
- Send back rejected by the safety check: "This one couldn't be sent. Try a sunset photo."
- Daily limit reached: the card's button is replaced by "You can send more tomorrow."
- Microphone blocked or unavailable: Say it is hidden; typing only.
- Sent to you, empty: "When friends send you a sunset, it shows up here."

## Copy at a glance
| Where | Text |
|---|---|
| Share Page, after Send | "Sent! Louise will see your reaction and what you added to the story." · Change |
| Send card | "Send Louise a sunset" · "With the story behind it." · Choose a sunset photo · "No account needed. Only Louise will see it." · prints: "Louise's", "Your sunset" |
| Share Page footer (personal link) | "Steve, you're in 8 of Louise's sunsets" · "Start your own Journal and they'll be waiting for you." · Start your own Journal |
| Send screen | "Send Louise a sunset" · "The story behind it" · Type it · Say it · Send to Louise · "We remove the photo's exact location before it's sent." |
| Sent | "Sent!" · "Want to keep this one?" · Save it to my Journal · Back to Louise's sunset |
| Welcome | "8 sunsets from Louise are coming with you." · "We filled it in from Louise's link. Change it if you like." |
| Arrival | "8 sunsets with Louise are in your Journal" · See your Journal |
| Steve's Journal and copy | "Shared by Louise" · "New from Louise" · "Louise's story" · "What you added" · Add your own story · Delete from my Journal |
| Louise's notices | "Steve started his Journal with 8 of your sunsets together." · Sunsets with Steve · Not Steve? · "Steve sent you a sunset" · See it |
| From your friends | "Steve saved this to his Journal" · "Steve sent one back" · "Let Steve know you loved it" · Delete Steve's sunset |
| Sent to you | "Sent to you" · "for a sunset you deleted" |
| Emails | "Steve sent you a sunset" · See Steve's sunset · "Steve started his Journal with your sunsets" · See your sunsets · Turn off these emails |

## Privacy rules (build-time checks)
- A copy never carries Louise's exact location, names, other friends' reactions, notes or additions, or the score.
- Sent-back photos are stored only after their metadata is removed.
- Sunsets sent back are seen only by the owner; reactions on them only by the owner and the sender.
- No face recognition anywhere.
- Update the privacy policy: copies go to the person a sunset was shared with when they join; sent-back photos have their location removed.

## Suggested build order
1. **4f-4 Add to the story** (if not already built), with the new wording.
2. **Claim:** claim cookie on `/s/[id]/join`, claim after sign-in, `share_recipients.claimed_user_id`.
3. **Copies:** copy entries and files, Steve's Journal and Entry Detail for copies (2.6, 2.7), Welcome and Arrival (2.4, 2.5).
4. **Louise is told:** notices (2.8, the line in 2.9) and the "started his Journal" email.
5. **Send Louise a sunset:** the card (2.1), send screen (2.2), metadata removal, safety check, daily limit, Sent (2.3).
6. **Receiving:** 2.9 "Steve sent one back" with owner reactions, Sent to you (2.10), the "sent you a sunset" email.
7. **Keep it:** "Save it to my Journal" sign-up from a sunset sent back.
8. **Later links:** Add to my Journal for a signed-in friend (decision 2).

## Done when
- Steve opens a personal link, sends a reaction, taps **Start your own Journal**, signs up, sees his name filled in, and lands on "8 sunsets with Louise are in your Journal", with each copy showing Louise's story and what he added.
- Louise sees "Steve started his Journal with 8 of your sunsets together." in her Journal and by email.
- Maria (no account) sends Louise a sunset with a spoken story; its photo has no location data; Louise sees it, reacts, and gets one email; Maria saves it to her own Journal and it becomes her first sunset.
- A fifth send-back from the same visitor in one day is refused kindly.
- Louise deletes a sunset Steve claimed: Steve's copy and any sunset sent back for it remain.

## Open questions
- [ ] When Steve shares his copy, does the Share Page show his own story, Louise's story, or both? (Suggested: his story if he wrote one, otherwise Louise's labelled "Louise's story". Louise to confirm.)
- [x] Phase number for this release: **Phase 4g** (Steve, November 27).
- [ ] Later links offer Add to my Journal instead of going straight in (decision 2). Louise to confirm.
