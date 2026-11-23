# Sunset Soul — Product Requirements Document (PRD)
**Status:** Draft — MVP scope
**Last updated:** November 22, 2026 (added 6.10 Sunsets Together and the November 22 wording decisions; see `sunset-soul-build-spec-sunsets-together.md`). Previously November 8, 2026 (MVP flow fixes; see `sunset-soul-build-spec-flow-fixes.md`)
**Companion docs:** Sunset Soul – Concept & Strategy (sunset-soul-concept.md) · Build Spec, Phase 4e flow fixes (sunset-soul-build-spec-flow-fixes.md) · Build Spec, Phase 4f Sunsets Together (sunset-soul-build-spec-sunsets-together.md) · Later List (sunset-soul-later-list.md)

---

## 1. Overview

Sunset Soul is a mobile app that lets everyday people capture a sunset as a personal memory, attach the story behind it, receive an automatic quality score, and share it with a small circle of friends and/or post it to a live global map.

This document defines the requirements for the **MVP** — the smallest version of the product needed to test whether people will repeatedly capture and keep meaningful sunset memories.

## 2. Goals

- Validate that users will capture sunsets as a recurring personal habit (the core hypothesis)
- Validate that users are motivated to share a captured sunset with friends
- Test the learning that people like to be in their sunset photos, and that photos with people are shared more (see 6.10)
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
- **Sunsets Together (6.10):**
  - Share rate and reaction rate for photos **with people vs. without** (the main test)
  - % of photos with people where the user adds names
  - Use of the With people filter and of Sunsets with [Name]
  - % of shares that include the user's voice
  - % of shared sunsets that receive a friend's memory (typed or spoken)
  - "Start your own Journal" rate for people named in a photo vs. other friends

## 4. Target User

Everyday people who are moved by beautiful, fleeting moments — not photographers. People who want a simple, low-pressure way to hold onto a sunset memory and occasionally share a genuinely good story behind one.

## 5. User Stories

- As a user, I want to save a photo of a sunset I just saw, so that I can keep it as a memory.
- As a user, I want to add a short story or caption to a sunset, so that the memory means more than just the photo.
- As a user, I want to see a score for my sunset when I'm curious, so that I understand how it compares to an "ordinary" one (the score is a quiet detail, never on the photo).
- As a user, I want to know why my sunset got its Wow score, so the score feels meaningful rather than random.
- As a user, I want to look back through my past sunsets in one place, so that I can revisit memories over time.
- As a user, I want to share a sunset (photo + title + story) with a few friends outside the app, so that I can show them a moment that mattered to me.
- As a user, I want to see how my friends reacted to a sunset I shared, so that I know it meant something to them too.
- As a friend who received a shared sunset, I want to react with a simple tap without downloading an app, so that I can respond quickly and warmly.
- As a user, I want to optionally post my sunset to a public map, so that others around the world can see it.
- As a user, I want my journal and shared history to persist across devices, so that I don't lose my memories.
- **Sunsets Together (6.10):**
  - As a user, I want to note who is in a sunset photo, so the memory includes the people I was with.
  - As a user, I want to see every sunset I've shared with one person, and send them the whole set, so we can relive them together.
  - As a user, I want friends to hear my story in my own voice, if I choose, so the share feels personal.
  - As a friend who received a sunset, I want to add my side of the story by typing or speaking, so the memory holds both of our versions.
  - As a friend who is in the photo, I want the Share Page to tell me I'm in it and let me say "I was there!"

## 6. Functional Requirements

### 6.1 Account / Login
- User can create an account and log in (method TBD — email, phone, or social login)
- User provides a first name once, on a **Welcome** screen after the first sign-in ("Welcome to Sunset Soul" · "Your sunsets, your stories, shared with family and friends." · "What's your first name?"). It appears on the Share Page ("Louise shared a sunset with you") and can be changed on the You (account) screen. Accounts created by email link have no name until they give one here.
- Journal entries and post history are tied to the account and persist across devices/reinstalls

### 6.2 Capture
- User can take a photo directly in-app (camera access) or select an existing photo from their device gallery
- **Choose from your photos** is the first choice and **Take a photo** the second (decided November 22): most people use the phone's own camera at sunset (fast, several shots, kept in their photo library) and add the best shot later.
- **Photos taken in the app are saved in the Journal** (MVP). Sunset Soul is a web app for now, which can't save to the phone's photo library on its own, and asking after every photo would slow people down, so there is no extra step. Automatic saving to the phone's photos comes with a native app (Later List).
- After capture/selection, user is taken to an entry creation screen

### 6.3 Journal Entry Creation
- Each entry gets a short title suggested by AI, based on the photo and the story if one was added (e.g., "Standing like sticks"). The user can edit it.
- If the AI is unavailable, the user can type a title, or the title is filled in once the AI is available. Saving is never blocked.
- After choosing a photo, the New sunset screen shows the photo, date taken and place (each with **Change**), an **Add your story** button (main) and a **Save for now** link. There is no story box on this screen.
- **Add your story** saves the entry first, then opens **The story behind this moment**: a typing box first (hint: "Where were you, and what made you stop to take this?"), **Need ideas?** (story ideas for this photo, closed until tapped), and below it **Rather talk than type?** (voice; see the Story Capture PRD). A story is never required.
- User can optionally tag a general location (auto-detected via device location, editable/removable by user)
- If the AI sees people in the photo, the story screen offers "Who's in this one?" (see 6.10b)
- On save, the entry is scored automatically (see 6.4) and added to the user's Journal

### 6.4 Scoring Algorithm (MVP version)
- Every saved entry is automatically scored across four parameters:
  - **The Palette** — color diversity/saturation analysis
  - **The Reach** — proportion of frame showing sunset color vs. neutral
  - **The Setting** — basic foreground/silhouette detection
  - **The Wow Factor** — the overall gut reaction to the photo, judged by an AI model that can see images (see 6.4a)
- Each parameter scored 1–10; composite score is a simple average
- **Where the score shows:** only in a **Score details** row on Entry Detail, seen only by the owner (a small apricot badge; tap to see the four parts and the reasons). Never on a photo, in the Journal, on the Share Page, on share images or on the From your friends screen. How often people open Score details tells us whether they care about a score.
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
- **People in the photo:** never judge anyone's appearance, and a dark or backlit face never lowers a score. A silhouetted figure can add drama (driver 4), but having people in a photo doesn't raise the score by itself. A plain selfie with an ordinary sky scores like an ordinary sky.

**Output:**
- A Wow score (1–10) and a **one-line reason** (about 15 words or fewer) explaining what makes the photo striking, shown on Entry Detail under the title and date ("Scoring…" in its place until it arrives). It is the part of the score people connect with. Example: *"Living trees standing among burned ones, glowing against the last light."*
- The reason describes only what's visible. It never identifies people. It names a landmark only when it's clearly recognizable or the user has tagged the location.

**Failure handling:** if the AI is unavailable when an entry is saved, the entry is saved with the other three scores and the Wow Factor (and composite) is completed as soon as the AI is available. No entry is lost or blocked.

### 6.4b Scoring Calibration (pre-launch requirement)
- Before launch, the founders rate a reference set of 30–50 sunset photos (ordinary to extraordinary) using the Wow anchor points.
- The reference set includes some photos with people (silhouettes, couples, groups, selfies), so the people rule in 6.4a is tested.
- The AI's Wow scores on the same photos must closely match the founders' ratings before launch; the AI's instructions are adjusted until they do.
- The reference test is re-run after any change to the AI instructions or AI model.

### 6.5 Journal (Personal Archive)
- Two views, switched under the title: **Stories** (inset photo cards with date and place, title and the first three lines of the story) and **Photos** (two columns of square photos under month headings, photos only, with a count such as "15 sunsets"; labeled "All photos" until November 22). The Journal remembers the last view used.
- Under the switch, a filter: **All · With people · Pure sunset** (see 6.10c). The Journal opens on **Stories** with **All** selected, and the filter works in both views.
- Nothing is drawn on the photos (no score).
- Shared entries show "Shared · [n] reactions" (see 6.9)
- Entries are private by default
- User can open an entry to view full detail: photo (full bleed), title, date and place, Wow reason line, full story, the recording if spoken, names ("With Steve"), friends' memories, Share, the "See what friends sent" row, Score details (closed), Delete
- **Navigation:** a header with the logo and a **New sunset** button (camera icon) on the main screens, and a bottom bar with **Journal · You**. Hidden while saving a sunset or telling a story; never on the Share Page.

### 6.6 Sharing (Share-Out, MVP)
- **Share** is the main button on Entry Detail. In the MVP (web app) it creates the link if needed and opens the phone's share menu right away; the link settings (Copy link, place name, Stop sharing) live on the From your friends screen.
- **Sharing one sunset is the default.** Before the share menu opens, a short **Before you share** step appears only when it applies: **Who are you sending this to?** (if the photo has names, see 6.10g) and **Include my voice** (if the story was spoken, see 6.10f). If neither applies, the share menu opens right away. Sharing a set of sunsets with one person is a separate choice (6.10d).
- Share generates a full-photo share card (vertical, sized for Stories) containing: the photo, title, and the story (if present). **No score**; only the logo mark top-left.
- **When there is a native app** (later): tapping **Share** opens a share panel with large icons for **Instagram**, **Snapchat**, **TikTok**, and **Facebook**, plus **Messages** and a **More** button
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
- Shares sent by email follow the email rules in 6.9c (small preview photo plus a button to the Share Page)
- **Photo sizes for sharing.** Never share the original photo straight from the camera (often 4000+ pixels and several MB). The app makes a right-sized copy for each place the photo goes:

  | Where it's shared | Image size | Notes |
  |---|---|---|
  | Instagram, Snapchat, TikTok, Facebook Stories | 1080 × 1920 pixels (tall) | Standard Stories size; smaller looks blurry |
  | Text messages (link preview) | About 1200 × 630 pixels | The phone shows it as a preview bubble for the Share Page link |
  | Email | File 1200 pixels wide, displayed at 600 pixels wide | Fits the standard email width and stays sharp on modern phone screens (see 6.9c) |
  | Share Page (web) | About 1600–2000 pixels on the long side | Sharp, but compressed so it loads quickly |

  - All copies are compressed (JPEG or similar) to keep file sizes small.

### 6.7 Live Global Map
- Separate map view showing sunsets that users have explicitly chosen to post publicly (distinct action from friend share-out)
- Posted entries appear as pins/markers at a general (non-precise) location
- **Retention logic:**
  - Default visibility window: placeholder **72 hours** from post time (exact duration TBD, tunable post-launch)
  - Entries with a high/extraordinary composite score may remain visible longer than the default window (exact threshold/logic TBD)
  - Community-vote-based retention is **out of scope for MVP** (Phase 2)
- Map is not real-time-as-captured; it reflects a rolling window of recent public posts, not live in-progress sunsets
- Photos with people are not posted publicly by default, and **photos of children are never allowed on the public map** (see 6.10)

### 6.8 Notifications (Nice to Have — include if feasible)
- Local notification reminding user of approximate sunset time based on device location
- User can enable/disable in settings

### 6.9 Friend Reactions

**Purpose:** Let friends respond to a shared sunset with a simple tap — no app download and no account needed. This stays within the MVP's "no friend list" rule: reactions are tied to a shared link, not to a friend connection.

#### 6.9a What friends see (Share Page)
The web page that opens when a friend taps a shared link. Its look matches the full-photo Stories share card.

- A small label at the top: *"[Name] shared a sunset with you"* (or *"[Friend], you're in [Name]'s sunset"* on a personal link, see 6.10g)
- The photo at the top of the page, with nothing on it
- Below it: the entry's title, date and place, and story (if present). **No score.**
- If the user chose to include their voice: a play button, *"Hear [Name] tell it"*, above the story (see 6.10f)
- **An invitation above the reactions,** asking the friend to reply to the sender:
  - Heading: **"Let [Name] know you saw it"**
  - Smaller line underneath: **"Tap one or more, and add a note if you like."**
- Four reaction buttons in two rows of two: **Wow**, **Wish I was there**, **Love this!**, **Sending hugs**
  - Rounded "pill" buttons with a line icon in the Sunset Soul style beside each word (Wow: sun with rays; Wish I was there: horizon; Love this!: heart; Sending hugs: a person with open arms). No emoji.
  - Sending hugs responds to the person, so it fits happy and bittersweet stories alike.
- The first time a friend taps a reaction, they're asked for their first name (one quick prompt; they aren't asked again on that device)
- When a friend taps a reaction:
  - The button fills with the `reaction-selected` color (peach blush), a small checkmark appears beside the count (never color alone), the icon gives one short animation (skipped under reduced motion), and the count goes up by one
  - A box appears to add a short note, with the placeholder text **"Add a note for [Name] (optional)"** and a **Send** button in the `action` color
  - Tapping the reaction again undoes it
- **After sending,** a short thank-you replaces the note box: **"Sent! [Name] will see your reaction."** Friends can still change their reactions afterward.
- Under the reactions and note: **"Were you there? Add your side of the story."** (type it or say it, see 6.10e). One **Send** button sends the reactions, note and memory together.
- At the bottom: a **Start your own Journal** link that invites friends to join the app (the built-in growth path). It's styled as a text link, not a button, so Send stays the one main button on the page (design system rule).
- No app download or account is needed to react

#### 6.9b What the user sees (From your friends)
A screen opened from Entry Detail. The title is **"From your friends"**. The row that opens it on Entry Detail reads **"See what friends sent"**, with the status on a second line underneath ("Shared · 4 reactions · 2 memories"; "Not shared yet" before sharing), so it never wraps, even with large text.

**Naming (decided November 22, 2026):** "Afterglow" is the team's working internal name for this screen and feature. It is never shown in the app, because "From your friends" is clearer.

- A small photo and the entry title
- Reaction totals (how many of each of the four reactions)
- **Their side of the story:** friends' memories, typed or spoken, each marked "Private to you" (see 6.10e)
- A list of who reacted and any notes they left (e.g., *Steve: "Best night of the whole trip"*)
- A **Share again** button (same as 6.6)
- **Link settings:** Copy link, the place name friends see, and Stop sharing (moved here from Entry Detail)

**Rules**
- Reactions are positive only. No negative reactions and no reactions about the score.
- A friend can choose more than one reaction.
- Notes are optional and limited to one short line (about 100 characters).
- Friends are asked for their first name on their first tap, so the user knows who reacted.
- Friends on the Share Page see only the reaction counts. Names and notes are seen only by the user who shared.
- The user can delete any reaction or note; the counts update.
- Colors follow the design system: `reaction-selected` (peach blush) for tapped reactions, `action` for the Send button. No red.
- Basic spam protection: limit how many reactions one visitor can send on one entry.

#### 6.9c Shared by email
When a sunset is shared by email, the email works like a postcard that invites the friend to the Share Page. It doesn't try to be the whole experience.

- **Small preview photo.** The photo is **displayed at 600 pixels wide** (the standard email width). The image file itself is 1200 pixels wide so it looks sharp on modern phone screens, and it's compressed to a small file size (under about 300 KB). Never send the full-size original photo in the email. (See the photo size table in 6.6.)
- Under the photo: **"[Name] shared a sunset with you"** and the entry title
- A clear button: **"See [Name]'s sunset and react"**, which opens the Share Page (6.9a), where the full-size photo and the reactions are
- **Build note:** today the full-size photo shows up enormous in the email. Check how the email is being created. If the app writes the email itself, use the 600-pixel-wide preview. If it goes through the phone's share menu, hand over a reduced-size image along with the link instead of the original photo.

**Not in MVP (later ideas)**
- More reactions beyond the four ("Sending love" is covered by Sending hugs)
- (Voice from friends is now in the MVP as part of Two sides of the story, 6.10e.)
- "Send one back" — friend replies with their own sunset
- Replying to a friend's reaction
- Push notification when a friend reacts

### 6.10 Sunsets Together (people in your sunsets)

**Purpose:** People like to be in their sunset photos, and photos with people are likely to be shared more. Sunsets Together helps users remember who they were with, share sunsets with the people in them, and let those people add their own side of the memory. It stays within the MVP's "no friend list" rule: everything works through names the user types and links they send.

**Main principle: the AI notices people; the user names them.** No face recognition at any stage.

#### 6.10a People check at save (hidden)
- When an entry is saved, the same AI request that writes the Wow line also answers: are there people in this photo (yes/no, and roughly how many)?
- It never identifies anyone.
- The answer is not shown to the user. It is used to compare share and reaction rates for photos with and without people (section 3), and to decide when to offer "Who's in this one?" (6.10b).
- **Optional build note:** if it's easy, also save each photo's "fingerprint" (a numeric description of what the photo looks like) and the story's fingerprint at save. Nobody sees this in the MVP, but it prepares for Finding Your Sunsets in Phase 2. If it adds real work, skip it; old photos can be processed later.

#### 6.10b "Who's in this one?"
- Shown on the story screen only when the AI sees people. Optional; never blocks saving.
- The user types first names or nicknames (e.g., "Steve", "the grandkids").
- Names the user has used before appear as tappable chips, so the same person is always spelled the same way.
- Names can be added, changed or removed later in Edit.
- Names are seen only by the user (and used to personalize links in 6.10g). They never appear on the public map.

#### 6.10c Journal filter
- At the top of the Journal: **All · With people · Pure sunset**. The Journal opens on **Stories** with **All** selected; the filter works in both the Stories and Photos views.
- "With people" uses the people check (6.10a) or any entry with names.
- Under the filter, when With people is chosen: a row of name chips ("Steve 12", "The grandkids 5"). Tapping one opens Sunsets with [Name].

#### 6.10d Sunsets with [Name]
- Tapping a name (on an entry, or from the name chips in the Journal) shows every sunset with that person, newest first: "Sunsets with Steve · 12".
- **Sharing one sunset stays the default** (Share on Entry Detail). Sharing a set is a separate, deliberate choice from this screen.
- **Share the set as one link:** the button reads **"Send Steve all your sunsets together"**, with the line "To share just one sunset, open it and tap Share."
  - A review step lists the sunsets with checkmarks, so the user can uncheck any they'd rather not include.
  - The Share Page shows the set in a scrolling list: *"Louise shared 12 sunsets with Steve"*, each with photo, title and story.
  - Friends react once to the whole set (one set of reactions, not one per photo).
  - **Stop sharing** works for the set as it does for single sunsets.

#### 6.10e Two sides of the story (type it or say it)
- On the Share Page, under the reactions: **"Were you there? Add your side of the story."**
- **Every friend the user sends the sunset to can add a memory,** on the normal link and on personal links.
- The friend chooses to **type it** or **say it**:
  - **Type it:** a box for a short memory (longer than a note; limit to be set, e.g. about 500 characters).
  - **Say it:** a record button in the web page. The browser asks once for microphone permission. **Up to 1 minute.** The AI turns it into text as well, so the user can read or listen.
  - If recording isn't available (some in-app browsers inside Facebook, Instagram or messaging apps block the microphone, as do some older phones), the page quietly offers typing only.
- No app or account needed. The friend gives their first name (same prompt as reactions), or it's already known from a personal link (6.10g).
- The user sees each memory on Entry Detail and on the From your friends screen as **"Steve's memory"**, with a play button if it was spoken.
- Only the user sees or hears friends' memories. The user can delete any memory.
- **Build note:** reuse the pieces from the user's own voice story (recording, time limit, saving, playback, speech to text). The new part is recording inside a web page.

#### 6.10f Share it in your own voice
- If the user's story was spoken, the Before you share step shows a switch: **Include my voice**. It is **off by default**.
- When on, the Share Page shows a play button, *"Hear Louise tell it"*, above the written story.
- The voice is never on share images or the public map, only on the Share Page link.
- If the user turns it off later, or deletes the recording, the voice disappears from the Share Page.
- **Change to the November 8 voice decisions (decided November 22):** "Only you can hear it" and "Friends never hear it" are replaced everywhere. New wording: **"Private until you share it"** on recording rows (story screen, Entry Detail); **"Your recording is private. You decide if friends hear it."** on the first-time microphone sheet; **"Your recording and story stay private until you share them."** as the note on the story screen. Friends' memories (6.10e) are marked **"Private to you"**. Updated in the screen designs and the flow fixes doc.

#### 6.10g "You're in Louise's sunset" and "I was there!"
- When the user shares a photo that has names, the Before you share step asks **"Who are you sending this to?"**, with the name chips plus **Someone else**.
- Choosing a name creates a personal link for that person:
  - The Share Page reads **"Steve, you're in Louise's sunset"**.
  - Steve isn't asked for his first name.
  - Steve sees **"I was there!"** in place of "Wish I was there" (four reactions stay the limit).
- **Someone else** creates the normal link (6.9a).
- Photos without names skip this step, so sharing stays one tap.
- Known limitation: if Steve forwards his personal link, others will see "Steve, you're in…". Acceptable for the MVP.

#### Privacy and safety rules (6.10)
- No face recognition and no face fingerprints, at any stage.
- The Wow line never identifies people (6.4a).
- People in a photo never raise its score by themselves, and appearance is never judged.
- Names, friends' memories and the user's voice are private to the user unless the user shares them as described above.
- Public map (later phase): photos with people are not posted by default. Before posting one: "There are people in this photo. Post it publicly anyway?" **Photos of children are never allowed on the public map.**

#### Sunsets Together — Phase 2 (not in MVP)
- Gift a sunset: send a sunset as a card on a chosen date (anniversary, birthday), with a personal message
- Afterglow keepsake (Afterglow is the internal name for From your friends): save the photo, story, reactions and friends' memories as one keepsake page
- A Share Page that opens like a sunset (the photo warms from dusk to full color)
- We found your sunsets: simple version first (pick many sunset photos at once on day one, landing with their real dates and places), then a full version where the app finds the sunsets in the camera roll

#### Finding Your Sunsets — Phase 2 (separate feature)
Uses the photo and story fingerprints (6.10a) together with dates, places and names:
- **Ask your Journal:** search in everyday words ("the beach with the grandkids")
- **More like this:** similar sunsets on Entry Detail
- **Pick the best one:** suggest the best of several nearly identical shots
- **Automatic collections:** by sky (On fire, Pastels, Stormy), by place (Ocean, Mountains), by people moment (Silhouettes, Family, Just the two of us, Pets) and by trip

#### Later
- Sunset books (printed, with stories and friends' memories)
- Season recaps ("Your sunset people this summer")
- Same spot over the years
- Look-alike sunsets on the Live Map

## 7. Screens (MVP)

Designs for every MVP screen, in dark and light mode: https://claude.ai/artifact/XCsz8MDaV7vdQPb6UM5Wd2 (screen-by-screen detail in `sunset-soul-build-spec-flow-fixes.md`).

1. **Sign in** — email link or password
2. **Welcome** — "Welcome to Sunset Soul", first name (once)
3. **Journal** — Stories and Photos views, the All · With people · Pure sunset filter (opens on Stories and All), empty state; header with New sunset, bottom bar Journal · You
4. **New sunset** — choose from your photos (first) or take a photo, date and place, Add your story / Save for now
5. **The story behind this moment** — type first, "Who's in this one?" names (when the AI sees people), Need ideas?, Rather talk than type?; first-use microphone note; recording; review and edit (recording playback, Add more, Delete recording, Help me polish it, title, Save)
6. **Entry Detail** — full photo, title, date and place, names ("With Steve"), Wow line, story, recording, friends' memories, Edit, Share, "See what friends sent" row, Score details (closed), Delete
7. **From your friends** (internal name: Afterglow) — totals for four reactions, friends' memories, names, notes, Share again, link settings
8. **You** — first name, email, Sign out
9. **Share Page (web)** — "[Name] shared a sunset with you", photo, title, optional "Hear [Name] tell it", story, "Let [Name] know you saw it", four reactions, note box, "Add your side of the story" (type it or say it), one Send, thank-you, "Start your own Journal". Variants: personal link ("Steve, you're in Louise's sunset", with "I was there!") and a shared set ("Steve, Louise shared 11 sunsets with you")
10. **Sunsets with [Name]** — every sunset with one person, "Send Steve all your sunsets together", then a review step to leave any out
11. **Before you share** — "Who are you sending this to?" and Include my voice (shown only when they apply)
12. **Live Map** and **Settings** — later; designed right before they're built (see the Later List)

The separate Score Result screen is replaced by the Wow line and "Scoring…" on Entry Detail.

**Copyright footer (all screens):** Every screen above, including the Share Page, shows a small line at the bottom: **"© 2026 Sunset Soul. All rights reserved."** Use the smallest text size and a muted color from the design system so it doesn't compete with the content. The shared-by-email message (6.9c) ends with the same line.

## 8. Out of Scope for MVP

The full list of later features lives in `sunset-soul-later-list.md`.


- Public story feed
- In-app friend circle / social graph (sharing is share-out only; friend reactions are link-based, see 6.9)
- Community/audience voting on entries or on map retention
- Weighted or fully trained scoring algorithm
- Rare Sightings badges and collection (future feature; described in the Concept doc)
- Physical products, brand partnerships, or any monetization features
- Real-time "sunset happening now" map behavior
- Sunsets Together Phase 2 items and Finding Your Sunsets (see 6.10 and the Later List)
- Face recognition, at any stage

## 9. Open Questions / Dependencies

- [ ] Exact retention window and score threshold logic for the Live Map (currently placeholder values)
- [ ] Login method (email vs. phone vs. social)
- [ ] AI vision provider and cost per photo for the Wow Factor
- [ ] Should Palette, Reach, and Setting also use the AI vision model (possibly simpler to build and more accurate) instead of pixel analysis?
- [x] Does the Wow reason line appear on the share card, Share Page, and Live Map? **Decided Nov 8, 2026:** no. It shows only on Entry Detail (owner).
- [ ] Location precision/privacy approach for map pins (general area vs. exact point)
- [ ] Platform priority — iOS first, Android first, or simultaneous
- [ ] Friend Reactions: does a share link stay open forever, or expire after a set time?
- [ ] Friend Reactions: can the user turn reactions off for a specific share?
- [ ] Sunsets Together: character limit for typed friend memories (about 500?)
- [ ] Sunsets Together: confirm the photo fingerprint can be saved cheaply in the MVP (optional)
- [ ] Public map (later): how to tell when a photo includes children (AI check plus the user's confirmation)

**Decided November 22, 2026:** friends' spoken memories are up to 1 minute; every friend the sunset is sent to can add a memory; photos of children are never allowed on the public map; voice wording is "Private until you share it" (6.10f); the reactions screen is titled "From your friends" and its row says "See what friends sent" (Afterglow stays the internal name); the Journal switch is "Stories · Photos" with the filter "All · With people · Pure sunset"; "Choose from your photos" comes before "Take a photo"; in the MVP (web app), photos taken in the app stay in the Journal with no extra save step.
