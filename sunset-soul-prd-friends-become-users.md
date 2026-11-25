# Sunset Soul — PRD: Friends Become Users (Release A)
**Status:** Draft. Comes first, before Your Sunset Map (decided November 24).
**Started:** November 24, 2026, by Louise, with Claude.
**Companion docs:** MVP PRD (`sunset-soul-prd.md`, especially 6.9 Friend Reactions and 6.10 Sunsets Together) · Sunset Map PRD (`sunset-soul-prd-sunset-map.md`, Release B) · Later List (`sunset-soul-later-list.md`: "From friends to a family circle") · Phase 4f Build Spec (`sunset-soul-build-spec-sunsets-together.md`) · Steve's build plan (`app-strategy-phases.md`)
**Phase number:** "Release A" is a working name. Steve gives it a phase number when he plans it (Phases 5 to 10 are already used).

---

## Order: before the Sunset Map (decided November 24, 2026)
Friends Become Users comes **first**, before Your Sunset Map (Release B). Why:
- **Friends are receiving sunsets now.** The beta starts at Thanksgiving, so every share is already creating people who could join. This release turns those moments into new users right away; the map is more valuable once there are more users with more sunsets.
- **It builds directly on what Steve just built.** Personal links (Phase 4f-3) already know who each link is for, which is exactly what "Claim your sunsets" needs.
- **The Sunset Map needs merging with Steve's map plan** (Phase 6), which takes a conversation first.

## 1. Overview
Today friends can view a shared sunset, react, and add to the story without an account. Release A gives them two warm reasons to start their own Journal:
1. **Claim your sunsets:** someone who is *in* your sunsets starts their Journal with those sunsets already in it.
2. **Send one back:** any friend can reply with a sunset of their own, and then keep it in a Journal of their own.

It stays within the "no friend list" rule: everything works through the links people already send. The Family Circle (friends connected in the app) is a later release.

## 2. Goals
- Turn people who receive sunsets into people who keep their own.
- Turn one-way sharing into a back-and-forth, so both people come back.
- Keep reacting and replying possible **without** an account, always.

## 3. Success metrics
- **"Start your own Journal" rate for people named in a photo vs. other friends** (already in the MVP PRD). Release A should raise it most for named people.
- % of named people who join and claim their sunsets
- % of claimers who save a sunset of their own within 7 days
- **Send one back:** % of Share Page visitors who send one back
- % of senders who then save their sunset to their own Journal (sign up)
- % of sent-back sunsets that the receiver reacts to

## 4. Principles
- **Friends can always react without the app.** Joining is a bonus, never a gate.
- **Invite at emotional moments, not with pop-ups.** "You're in 8 of Louise's sunsets" and "Send one back" are invitations, not ads. No pop-ups, no "Download our app!"
- **The story travels with every sunset.** A sunset is never passed along as a bare photo.
- **A shared sunset is a copy** (decided November 24). Once shared, it's the friend's memory too.
- **Private until you share it** (MVP 6.10) still holds: names, exact locations and recordings stay private unless the owner shares them.

## 5. User stories
- As someone in Louise's sunsets, I want to start my own Journal with those sunsets already in it, so I don't start from nothing.
- As Louise, I want to know when Steve starts his Journal with our sunsets, so I feel the share mattered.
- As a friend who received a sunset, I want to send one of my own back, with its story, without making an account.
- As that friend, I want to keep the sunset I sent in a Journal of my own, if I choose.
- As Louise, I want to see and react to the sunsets friends send back.

## 6. Requirements

### B1. Claim your sunsets

**B1a. Who sees the invitation**
- Only on **personal links** (MVP 6.10g), where the Share Page already knows the friend's name. Normal links keep the plain **Start your own Journal** text link.
- The count is the number of Louise's sunsets that Louise has shared with Steve through a personal link and is still sharing.

**B1b. The Share Page wording**
- Replaces the plain "Start your own Journal" link on personal links, in the same place (bottom of the page, styled as a text link so Send stays the one main button):
  - Several: **"Steve, you're in 8 of Louise's sunsets. Start your own Journal and they'll be waiting for you."**
  - One: **"Steve, you're in Louise's sunset. Start your own Journal and it'll be waiting for you."**
- If Steve already has an account: **"Add them to your Journal"**, which signs him in and adds them.

**B1c. Joining**
1. Steve taps the link and signs in the usual way (email link). The app remembers which personal link he came from.
2. The Welcome screen fills in his first name ("Steve") from the link; he can change it.
3. A short arrival screen: **"8 sunsets with Louise are in your Journal"**, with a row of the photos and a **See your Journal** button.
4. His Journal opens with the sunsets in it.

**B1d. Matching Steve to his sunsets**
- Steve's account is matched through the personal link he signs up from.
- All of Louise's personal links for the same name ("Steve", ignoring capital letters) are matched to Steve's account, so every sunset she has shared with him arrives, not just the one he tapped.
- **After Steve joins, new personal links Louise sends him go straight into his Journal** (decided November 24), with a small line on the sunset: "New from Louise."
- Known limitation, as in the MVP: if Steve forwards his personal link, someone else could join as Steve. Louise's notice (B1f) gives her a way to say so.

**B1e. What Steve's copy contains**
- **Copied:** the photo, title, date, place name, **Louise's story** (labeled "Louise's story") and **what Steve added to the story**, if he added anything (labeled "What you added"). Both of their words, together.
- **Louise's voice** only if she included it on Steve's link.
- **Labeled "Shared by Louise"** on the card and on Entry Detail.
- **General location copied** (decided November 24): the town-level location, so the sunset can appear on Steve's own Sunset Map later. Never Louise's exact location.
- **Not copied:** Louise's exact location, the names Louise added to the photo, other friends' reactions, notes and what they added, and the score details.
- Steve can add his own story, his own names, and share it like any of his sunsets. Louise's story stays as she wrote it; Steve can't edit it.
- **No new AI cost:** the copy reuses the title and score already made for the photo.
- **Copies stay** (decided November 24): if Louise later stops sharing or deletes her sunset, Steve keeps his copy. Steve can delete his own copy; Louise can't delete it for him.

**B1f. Louise is told** (decided November 24)
- A warm notice, never "claimed": **"Steve started his Journal with 8 of your sunsets together."**
- Where it shows: a one-time card at the top of Louise's Journal, and a line on each of those sunsets' **From your friends** screen: "Steve saved this to his Journal."
- **Also by email** (decided November 24), sent to the email Louise signs in with (see B3).
- On the card, a small link: **"Not Steve?"**, which tells the Sunset Soul team so they can look into it.

### B2. Send one back

**B2a. The invitation**
- On every Share Page (normal and personal links), after the friend sends their reactions (under the thank-you): a card headed **"Send Louise a sunset"**, with the line "With the story behind it." and the main button **Choose a sunset photo**. It stands out from the rest of the page: two tilted photo prints (Louise's sunset and an empty one with a plus sign and "Your sunset") and a warm peach outline. Once the friend has sent their reaction, this is the one main button on the page.
- Also shown to friends who don't react, as a quiet text link near the bottom.

**B2b. Sending**
1. **Choose a photo** from the phone (one photo per send).
2. **Add its story:** type it or say it, reusing Add to the story (MVP 6.10e): typing first, a record button for up to 1 minute, typing only when the microphone isn't available.
3. First name: already known from a personal link or an earlier reaction; otherwise asked once.
4. **Send.** Thank-you: **"Sent! Louise will see your sunset."**
- No app or account needed.

**B2c. Safety and privacy**
- **Remove the location from the photo file** before it's stored. Phone photos carry the exact place they were taken, and a friend shouldn't share that by accident.
- Run the existing "is this a sunset / is it safe" check (Phase 3) on the photo. If it fails, nothing is delivered and the friend sees: "This one couldn't be sent. Try a sunset photo."
- Basic spam protection: **up to 4 sunsets sent back per visitor per day** (decided November 24; a setting the team can change). After that: "You can send more tomorrow."
- Only Louise sees a sunset sent back to her.

**B2d. What Louise sees**
- On that sunset's **From your friends** screen: **"Steve sent one back"**, with the photo, story, and a play button if spoken.
- A one-time card at the top of her Journal: **"Steve sent you a sunset."**
- **Also by email** (decided November 24; see B3).
- Louise can **react** with the same four reactions. Steve sees her reactions once he has a Journal ("Louise loved the sunset you sent"), which is one more reason to join.
- Louise can **delete** any sunset sent back to her.
- **"Sent to you" list** (decided November 24): a simple list of every sunset friends have sent back, newest first, opened from the You screen. If Louise deletes the sunset a friend replied to, the sunset they sent stays here.

**B2e. Keeping it**
- After sending, the friend sees: **"Want to keep this one? Save it to your own Journal."**
- Tapping it starts sign-up (as in B1c). The sunset becomes the first sunset in their Journal, with its story; it's titled and scored at that point (so the AI cost only happens for people who join).
- If the friend never signs up, the sunset stays only with Louise.

### B3. Email notices (decided November 24)
The app has each account holder's sign-in email (friends who haven't joined have none on file). Louise gets a short email for each of these, so she knows right away and comes back to the app:

| When | Subject | Body |
|---|---|---|
| A friend starts their Journal with her sunsets | "Steve started his Journal with your sunsets" | "Steve started his Journal with 8 of your sunsets together." · button **See your sunsets** |
| A friend sends one back | "Steve sent you a sunset" | A small preview photo (email size rules, MVP 6.9c) and the first line of the story · button **See Steve's sunset** |

- Warm, short, and in the Sunset Soul look; the button opens the app at the right screen.
- Every email has a way to turn these emails off (a link in the email, and a switch in Settings when Settings arrives).
- One email per event. If a friend sends several sunsets in one day, combine them into one email ("Steve sent you 3 sunsets").
- Ends with the copyright line (MVP section 7).

## 7. Screens (new or changed)
1. **Share Page (personal link):** the "you're in 8 of Louise's sunsets" invitation (B1b).
2. **Share Page (all links):** "Send one back" after the thank-you (B2a).
3. **Send one back:** choose photo, story (type it or say it), name, Send, thank-you, "Save it to your own Journal" (B2b, B2e).
4. **Welcome:** first name filled in from the link (B1c).
5. **Arrival screen:** "8 sunsets with Louise are in your Journal" (B1c).
6. **"Sent to you" list:** every sunset friends sent back, from the You screen (B2d).
7. **Journal and Entry Detail for a copy:** "Shared by Louise", "Louise's story" and "What you added" (B1e).
8. **Louise's Journal:** one-time cards "Steve started his Journal with 8 of your sunsets together" and "Steve sent you a sunset" (B1f, B2d).
9. **From your friends:** "Steve saved this to his Journal" and "Steve sent one back" with reactions (B1f, B2d).
10. **Emails:** "Steve started his Journal with your sunsets" and "Steve sent you a sunset" (B3).

## 8. Out of scope for Release A
- The Family Circle and any friend list (later release)
- Push notifications (native app)
- Steve seeing Louise's other names or her exact locations
- Replying to reactions

## 9. Open questions
- [x] Louise's notices (Steve joined, Steve sent one back) also go by email, one email per event (B3). **Decided November 24.**
- [x] After Steve joins, new personal links go straight into his Journal. **Decided November 24.**
- [x] Steve's copy gets the general (town-level) location, so it can appear on his own Sunset Map later. **Decided November 24.**
- [x] Up to 4 sunsets sent back per visitor per day. **Decided November 24.**
- [x] If Louise deletes the sunset a friend replied to, the sunset they sent stays in a simple "Sent to you" list. **Decided November 24.**
