# Sunset Soul — Later List
**Started:** November 8, 2026, by Louise. **Updated:** November 24, 2026: reorganized by *when* each feature should be built (Release A Friends become users, then Release B Your Sunset Map, then Release C Bucket List and trips; the story travels with every share; Phase 6 Live Map; proposed Release D Family Circle and Release E finding and looking back). Keepsakes and business are no longer tied to the holidays. Earlier updates: November 22 (Sunsets Together, Finding Your Sunsets, native app section).
**What this is:** features we've decided are *not* in the MVP, kept in one place so good ideas aren't lost, and arranged in the order we expect to build them. Each one is designed right before it's built, using the design system and the flow map. When a group is chosen for building, it gets its own build spec (like Phase 4e flow fixes and Phase 4f Sunsets Together).
**Related:** MVP requirements in `sunset-soul-prd.md` · MVP decisions in `claude/sunset-soul-flow-fixes.md` · Concept doc "Later (v2+)".

---

## The order at a glance

| When | What | Why then |
|---|---|---|
| **Now** | MVP (PRD), Phases 4e and 4f | Test the core habit and whether photos with people are shared more |
| **Soon after launch** | Small fixes and basics | Things real users will need in the first weeks |
| **Release A** | Friends become users: "Claim your sunsets" and "Send one back" | Turns people who receive sunsets into people who keep their own |
| **Release B** | Your Sunset Map | Something new and different; a reason to come back that grows over time, and works for one person alone |
| **Release C** | Bucket List and trips | More reasons to open the app between sunsets |
| **Phase 6** | Live Map | Needs enough users posting to feel alive |
| **Release D** *(proposed)* | Family Circle | Connects people who are both users |
| **When it's a native app** | Phone-only features | Timing depends on the move to the App Store and Google Play |
| **Release E** *(proposed)* | Finding your sunsets and looking back | Valuable once Journals are large |
| **Not yet scheduled** | Good ideas waiting for a home, including keepsakes and business | Revisit after the MVP results |

**Release letters are working names.** Steve's build plan (`app-strategy-phases.md`) already uses Phase 5 to 10 (5 AI Story Capture, 5b user admin, 5c CI, 6 Live Global Map, 7 Hardening and beta, 8 Daily Ritual, 9 and 10 native apps). Steve gives each release a phase number when it's planned.

**Louise's decisions (November 24):** the personal map comes before the Live Map; the work is split into three smaller releases (together it was about three times the size of Phase 4f); **Friends become users (Release A) comes first**, before the Sunset Map (Release B), since it needs no friend list, builds on the personal links Steve just finished, and helps the app grow as the beta starts. Releases D and E are proposed and can move.

**To agree with Steve:** his plan (updated November 20) has the Live Global Map (Phase 6) next. Louise's decision puts Friends become users (Release A) next, then Your Sunset Map (Release B), both before the Live Map. The two share a lot (the map, clustering, the Map tab), so building the personal map first may also make the Live Map quicker.

**The story travels with every share (decided November 24).** Anywhere a sunset is shared in these phases (from a map pin, a map link, a trip, a set, or a friend's "Send one back"), the story goes with it, along with the voice if the user chose to include it. A sunset is never shared as a bare photo.

---

## Soon after launch
*Several of these are already in Steve's Phase 7 (Hardening and beta): account deletion, data export, and installing to the home screen.*
Small, low-risk additions that real users will need quickly. Could be one small build spec.
- **Dead-link page:** a kind message when a share link was stopped or the sunset deleted.
- **Account deletion and data export.** App stores require account deletion, and privacy laws expect people to be able to delete and download their data, so do this early.
- **Settings:** AI story help on/off, delete all recordings, notification choices.
- **"Add to Home Screen" guidance** (helps the web app feel like an app, and is needed for reminders on iPhone) and a short **first-time welcome tour.**
- **Favorites:** mark a sunset as a favorite and see only favorites in the Journal. Use a **star**, not a heart (the heart already means "Love this!").
- **"Be in it" capture tip:** a gentle suggestion to turn around and take a silhouette photo against the light. Supports the people test.
- **Safety: a gentle check on saved stories** (before a wider public launch): if a story suggests someone is in crisis, show a kind message with a crisis line for their country. The old interview had this, triggered by its follow-up questions; the Phase 4e story screen has no follow-up questions, so the message had no trigger. Dropped for the beta on November 23 (Steve). Needs careful wording, country-specific numbers and review before it comes back.
- **A Share Page that opens like a sunset:** the photo warms from dusk to full color when a friend opens the link.

---

## Releases A–C: friends, the map, and the bucket list
**Decided November 24, 2026:** comes after the MVP and before the Live Map, split into three releases so each ships something people can use and we can learn before building the next.

**Release A: Friends become users (first)**
- **Step 1, "Claim your sunsets," and Step 2, "Send one back"** (details under "From friends to a family circle" below)

**Release B: Your Sunset Map (second)**
- **Your Sunset Map, people first** (details below)
- **We found your sunsets, simple version:** pick many old sunset photos at once; they land with real dates and places, AI titles and Wow lines, so the map is full on day one. Without it, the map starts empty. Each one can get a story later, and the app gently invites it ("Add the story behind this one?"). (The full version, where the app finds them for you, is under "When it's a native app".)
  - **Limit: 10 past sunsets per person for now** (decided November 24), to keep AI costs down (each photo gets an AI title and Wow score). The limit is a setting the team can raise later without new building. It applies only to adding photos in bulk; adding sunsets one at a time works as it does today.
  - The screen says how many are left ("Add up to 10 of your favorite past sunsets"), so nobody is surprised.
- **Jump to:** a button in Photos that lists years and months, needed once people add old photos in bulk.
- **Celebrations** (details below)
- **Map share card** (details below)

**Release C: Bucket List and trips**
- **Sunset Bucket List** (details below)
- **Trips** (details below)
- **Share several sunsets at once:** pick a few in Photos (say, five from one trip) and send them together, each with its story. (Sharing a set by person is already in the MVP as Sunsets with [Name]; this is the free-choice version.)
- **Transparent sticker** version of the map numbers.
- Trips, the sticker and share several at once are the easiest to push later if Release C needs trimming.

**Not in Releases A–C:** Same Sky and two-person maps (they need the family circle, Release D), and anything that needs the native app.
**Timing:** let the MVP run first and check the main test (are photos with people shared more?). A yes is strong evidence for a people-first map.
**Already in place:** the MVP saves place details with every entry (PRD 6.3), so Release B won't need to reprocess old sunsets.

### Your Sunset Map (a personal map of every sunset you've seen)
Inspired by Been, an app that fills in a world map with the countries you've visited. Sunset Soul borrows the map and the satisfying numbers, but **not the focus on travel.** Been is about how many countries you've been to. Sunset Soul is about **the sunsets you've shared with the people in your life.** The map should feel like "every place we've watched the sun go down together," not a travel scoreboard. Each pin holds the photo and story behind it, which Been can't do.

**Where it lives**
- The bottom bar grows from Journal · You to **Journal · Map · You**. The Map tab opens on **My sunsets**. When the Live Map arrives (Phase 6), a switch at the top adds **Everyone**, so one tab does both jobs.

**People come first (decided)**
- The map uses the same filter as the Journal: **All · With people · Pure sunset**. Choosing **With people** shows the name chips ("Steve 23", "The grandkids 12"), and tapping one shows only the sunsets with that person on the map.
- **Your sunset people:** under the headline numbers, a row of the people you've watched the most sunsets with, each with a count. Tapping a person opens Sunsets with [Name], including its map view.
- Pins for sunsets with people have a small marker (for example, a tiny figure), so the shared moments stand out at a glance.

**The map**
- Each saved sunset with a place is a pin showing a small round photo. Tapping it opens Entry Detail, with its story and the normal **Share** button (photo, title and story, as in PRD 6.6).
- Zoomed out, nearby pins group into one bubble with a count ("12").
- Pins sit at the exact spot, because only the owner sees this map.
- Filter: **All time · This year**, alongside the people filter above.
- Sunsets with no place still count in the totals. The app gently asks "Where was this?" so they can join the map.

**The numbers**
- **Headline: sunsets, sunsets with people, and places:** **"128 sunsets · 42 with your people · 34 places."**
- **What counts as a place: cities and named locations** (decided). A place is either a city or town, or a named spot such as a park, beach or landmark (for example, Sequoia National Park or Torrey Pines).
- **Each sunset counts toward one place:** the named spot if the photo was taken in one, otherwise the city or town. A sunset at Torrey Pines counts as Torrey Pines, not also as San Diego, so nothing is counted twice.
- The app suggests the place name from the photo's location using map data, and the user can change it (the same **Change** used on the New sunset screen). Personal spots the map doesn't know ("Grandma's lake house") can be typed in.
- **States and countries: shown, but not a focus** (decided). They appear quietly in the places list (tap the headline to see places grouped by state and country, with a small count such as "9 states · 3 countries"). They are not in the headline, and there are no region tabs or "% of the world".
- **Build note:** the place name, city, state, country and map location are saved with every entry from the MVP on (PRD 6.3).
- Numbers only go up.
- **Sunsets only** (decided). Sunrises aren't counted or promoted. The app doesn't check whether a photo is a sunrise.

**Celebrations**
- **People moments first:** "Your 10th sunset with Steve," "Your first sunset with the grandkids this year."
- **"New place!"** the first time a sunset is saved at a new place. Kept small; no special fanfare for a new country.
- **Milestones** at 10, 25, 50, 100, 250 and 500 sunsets.
- Warm and brief. **No streaks:** missing a cloudy week should never feel like failing.

**Fill the map on day one**
- Pairs with **We found your sunsets** (simple version). An empty map gives nobody a reason to come back; a map with 40 pins does. (Been's empty state, a gray map and a row of zeros, is the example to avoid.)

**Share your map**
- A share card in Stories size: **"128 sunsets · 42 with the people I love,"** the map, and the user's best sunset photo.
- **No names on the share card** by default, since it may be posted publicly (names stay private, PRD 6.10).
- The photo defaults to one **without people**, for the same reason; the user can change it. **Never a photo of children.**
- The map on the card is zoomed out, with no exact pins. No score.
- The card comes with a link to a **map page** for friends: the pins, and tapping one shows that sunset's photo, title and story (and the voice if the user chose to include it), with the usual reactions. The story travels with the map.
- Before sharing, the user can leave out any sunset from the map page, like the review step for sets (PRD 6.10d).
- A **transparent sticker** version of the numbers, to lay over a Stories photo (Been does this well). Release C.

**Sunsets with [Name] on the map (Compare)**
- **Works by the names the user adds to photos, private to the user** (decided). No friend list needed. This is the heart of the map.
- On Sunsets with [Name], a map view: **"You and Steve: 23 sunsets · 6 places."**
- Can be sent to that person as a link, the same way as "Send Steve all your sunsets together": **"Every place we've watched the sun go down."** Each sunset on it shows its photo, title and story.
- Later, with the family circle (Release D): two people's maps shown together.

**Trips**
- Sunsets saved close together in time, away from the user's usual places, group into a trip automatically: **"Maui, June 2026 · 7 sunsets."** The trip shows who was there ("with Steve and the grandkids"). The user can rename a trip or split it.
- A trip can be sent as a set, like Sunsets with [Name], with each sunset's story. Release C.

**Open questions**
- **Map service:** use what Steve already has (decided November 24). Today place names come from GeoNames (towns of 1,000+ people) in the app's own database, so no location is sent to an outside service; landmark names can come later with the Phase 6 map provider (Steve's November 20 decision). To confirm with Steve: how parks, beaches and landmarks (Torrey Pines, Sequoia National Park) get named, and the cost as usage grows.
- How the app tells which places are "home" for trips (likely the place with the most sunsets).
- The exact marker for pins with people.

### Sunset Bucket List
**Decided November 24, 2026:** suggestions to get started, plus places the user adds. Because people live in different places, everyone's list will be different. It also gives people a reason to open the app when they *aren't* watching a sunset: planning a trip, dreaming, or saving a spot a friend mentioned.

**Suggestions**
- **Near you:** spots within a few hours' drive of the user's home area, suggested by AI and checked for accuracy (for Carlsbad, for example: Sunset Cliffs, La Jolla Cove, Torrey Pines).
- **Iconic sunsets:** a list chosen by the Sunset Soul team (Key West, Santorini, the Grand Canyon, Maui, and others).
- **Themed lists:** Over the ocean, Mountains, Deserts, National parks, Big cities. Tap the ones you like; skip the rest.

**Add your own**
- Type a place or drop a pin on the map, for personal spots no list would know ("the dock at Grandma's lake house").
- Optional note on why it matters ("For our 40th anniversary").
- Optional names, using the Sunsets Together name chips ("Someday with Steve").

**Checking it off (the payoff moment)**
- When the user saves a sunset near a bucket list spot, the app asks: **"Is this your Key West sunset?"** One tap moves it from **Someday** to **Seen**, with the photo on it.
- On the map, Someday spots are outlined pins and Seen spots glow with their photo.
- A running count: **"4 of 12 seen."**

**Sharing**
- A **"My sunset bucket list"** share card.
- Later: friends can suggest a spot for the user's list from the Share Page.

**Open questions**
- How close counts as "at" a spot (start around 10 miles; adjustable).
- How "Near you" suggestions are reviewed for accuracy before they're shown.
- Bucket lists are private by default unless shared (assumed; confirm).

---

## Phase 6: Live Map
- **Live Map and "Post to map."** Comes after Your Sunset Map. The Map tab (Journal · Map · You) opens on My sunsets, with a switch to **Everyone** for the Live Map. New sunset stays at the top of the screen.
- **People check before posting:** photos with people stay off the public map by default, and photos of children are never allowed (PRD 6.10).
- **Community voting** that keeps great sunsets on the map longer, and **a community score** alongside the automatic one.
- **Look-alike sunsets on the Live Map** (public posts only; uses the photo fingerprints from Release E, so it may arrive later).

---

## From friends to a family circle (Steps 1–2 in Release A, Step 3 in Release D)
**Decided November 24, 2026.** Sharing with family and friends is the heart of the app. Today friends can view, react and add their memories without becoming users. This path turns people who *receive* sunsets into people who *keep* their own: a ladder where each step gives a friend a reason to come one step closer. **Steps 1 and 2 are built in Release A**, since they need no friend list. **Step 3, the Family Circle, is proposed Release D** (the in-app friend connection, Phase 2 in the PRD).

**Two principles**
- **Friends can always react without the app.** Joining is a bonus, never a gate; not everyone in the family will download an app.
- **Invite at emotional moments, not with pop-ups.** "You're in this sunset" and "Send one back" feel like invitations. "Download our app!" feels like an ad.

**Step 1: "Claim your sunsets" (the biggest lever; Release A)**
- Builds on personal links (PRD 6.10g), which already know who's in a photo.
- On Steve's Share Page: **"Steve, you're in 8 of Louise's sunsets. Start your own Journal and they'll be waiting for you."** This replaces the plain "Start your own Journal" link on personal links.
- When Steve joins, the sunsets he's in appear in his new Journal **with Louise's story and his own memory together** (both sides of the story), **only those Louise has shared with him.** Louise's original stays hers; Steve's copy shows "Shared by Louise."
- **Louise is told (decided):** a warm notice, not "claimed": **"Steve started his Journal with 8 of your sunsets together."**
- **Steve's copies stay (decided).** If Louise later stops sharing or deletes her own sunset, Steve keeps his copy. Once shared, it's his memory too, like giving someone a printed photo. Steve can delete his own copies; Louise can't delete them for him.
- **No extra warning when sharing (decided):** people already understand that sending something to someone means sending a copy.
- Why it works: most apps make new users start from zero. Steve arrives with a Journal already full of his own memories.
- **Open questions:** how Steve's account is matched to the name on Louise's photos (likely through the personal link he signs up from); whether sunsets Louise shares with Steve after he joins go straight into his Journal (assumed yes).

**Step 2: "Send one back" (Release A)**
- On the Share Page: **"Seen a great sunset lately? Send one back to Louise."** The friend adds a photo **and its story, typed or spoken**, with no account (reusing Two sides of the story, PRD 6.10e).
- Louise sees it in From your friends, photo and story together, and can react to it.
- The friend then sees **"Want to keep this one? Save it to your own Journal,"** a natural, no-pressure moment to sign up.
- Turns a one-way share into a back-and-forth, which keeps both people coming back.

**Step 3: Family Circle (once both people are users; proposed Release D)**
- When someone you've shared with joins: **"Steve joined Sunset Soul. Add him to your circle?"**
- A small, private circle of family and close friends, not a public social network. Sunsets posted to the circle appear for everyone in it, without sending links one by one.
- Names stay private by default, and no face recognition, as in PRD 6.10.

**What the family circle unlocks**
- **Same Sky:** when two connected people save a sunset on the same evening in different places, the app shows them side by side: **"Same night, 1,000 miles apart."** A strong hook for families who live apart.
- **A family sunset map** and **two-person maps** (your map and Steve's together).
- **"Our sunsets" shared albums** that everyone on a family trip adds to.
- **Friends tab:** every reaction and note across all your shared sunsets in one place, newest first. The bottom bar becomes Journal · Map · Friends · You.
- **Reply to a friend's reaction.**
- **Notifications** when a friend reacts and the **home-screen widget** (both work best in the native app).

**How we'll know it's working**
- The PRD already tracks "Start your own Journal" taps. Compare the rate for people named in a photo with other friends. If Step 1 works, named people should join at a much higher rate.
- For Step 2: how often friends send one back, and how many of them then save it to their own Journal.

---

## When it's a native app (App Store and Google Play)
Sunset Soul is a web app for the MVP. These features need, or work much better in, a native phone app. In Steve's plan this is Phase 9 (a native shell around the web app, after the beta) and, only if needed, Phase 10 (fully native apps).
- **Photos save to the phone automatically:** every photo taken in the app is copied to the phone's photo library, with no extra step (the phone asks permission once). In the MVP, photos taken in the app stay in the Journal; a "Save to your photos" step after every photo was tried and dropped on November 22 because it slowed people down.
- **"From today" photo strip:** at the top of the New sunset choose-a-photo step, a row of photos taken in the last few hours, so someone who just took ten shots of tonight's sunset can tap the best one without searching.
- **We found your sunsets, full version:** the app finds the sunsets in the camera roll for you. (The simple pick-many version is in Release B.)
- **One-tap Instagram, Snapchat, TikTok and Facebook buttons** on the share panel.
- **Sunset reminders** that work reliably (PRD 6.8; on a web app they need the app installed to the home screen on iPhone).
- **Golden-hour daily moment:** a nudge to capture tonight's sunset (BeReal-style), possibly saying whether tonight's sky looks promising ("Worth stepping outside").
- **Notification when a friend reacts.**
- **Home-screen widget** for a close circle (Locket-style).

---

## Release E (proposed): Finding your sunsets and looking back
Most valuable once Journals are large. Uses the photo and story "fingerprints" (optional in the MVP, PRD 6.10a), plus dates, places and names.

**Finding**
- **Ask your Journal:** search in everyday words ("the beach with the grandkids", "after Dad's birthday").
- **More like this:** a row of similar sunsets on Entry Detail.
- **Pick the best one:** suggest the best of several nearly identical shots.
- **Automatic collections:** by sky (On fire, Pastels, Stormy, Last light), by place (Ocean, Mountains, Desert, City), by people moment (Silhouettes, Family, Just the two of us, Kids, Pets) and by trip.
- **Same spot over the years:** every sunset from one favorite place, side by side.
- Never: face recognition or face fingerprints.

**Looking back**
- **On this day:** "A year ago today…" memories of past sunsets. (Works sooner for people who added old photos in Release B.)
- **Season recaps:** a look back at a season's sunsets (Spotify Wrapped-style), including "Your sunset people this summer" and the map filling in over the year. A year-end recap is a natural December share.

**Scoring**
- **Weighted or trained scoring** once there's enough real data.

---

## Not yet scheduled
Good ideas without a phase yet. Revisit after the MVP results.
- **Several photos per sunset** (a carousel).
- **Rare Sightings badges:** "Sun rays", "Alpenglow", "Green flash" and others, with a collection in the Journal. The best candidate for something on the photo, instead of a number.
- **Public story feed** (Phase 2 in the PRD; after the family circle, if at all).

**Keepsakes and business** (no longer tied to the holidays, decided November 24)
- **Gift a sunset:** send a sunset as a card on a chosen date (anniversary, birthday, a hard day), with a personal message.
- **Afterglow keepsake:** save the photo, story, reactions and friends' memories as one keepsake page. (Afterglow is the internal name; in the app the screen is "From your friends".)
- **Sunset books:** printed books of a year's sunsets, with stories and friends' memories beside each photo. Also calendars and prints. The year's map could open the book.
- **Premium tier** and **brand partnerships** (travel, wellness, mindfulness).

---

## Never
- Face recognition or face fingerprints, at any stage (PRD 6.10).
