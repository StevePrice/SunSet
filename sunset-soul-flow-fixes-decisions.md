# Sunset Soul — MVP Flow Fixes (decisions and reasons)
**Status:** Agreed with Louise, November 8, 2026; **updated November 22, 2026** (see section 9, and the [Sunsets Together Build Spec](sunset-soul-build-spec-sunsets-together.md)). This is the record of *what* was decided and *why*. The build instructions are in the [Build Spec](sunset-soul-build-spec-flow-fixes.md); later ideas are in the [Later List](sunset-soul-later-list.md).
**Scope:** Fix the user flow of the screens already built, plus voice storytelling, which is now in the MVP. Everything else is designed right before it's built.
**Flow map:** https://claude.ai/artifact/4DfUMuiEysmM7yLrGySPsV
**Screen designs (Dark mode and Light mode pages):** https://claude.ai/artifact/XCsz8MDaV7vdQPb6UM5Wd2

---

## 1. The score is secondary, and never on a photo
The photo and the story lead. Nothing goes on a person's photo.

- **Where the score appears:** one place only, the **Score details** row on Entry Detail, seen only by the owner. The closed row shows "Score details" with the small apricot score badge beside it; tapping it opens the four-part breakdown (Palette, Reach, Setting, Wow Factor) and the reasons.
- **Where it no longer appears:** on any photo, in the Journal (both views), on the Share Page, on share images (Stories cards and link previews), in Afterglow.
- **The Wow line** (the one-sentence reason a photo is striking) sits under the title and date on Entry Detail, as a quiet caption. It is the part of the score people connect with.
- **Entry Detail order (top to bottom):** header (Back · New sunset) → photo full bleed, nothing on it → title → date and place → Wow line → story → (if spoken) "Hear it in your own voice" → small Edit link → **Share** (the one main button) → Afterglow row → **Score details** with the badge (closed) → Delete this sunset → bottom bar. (Title first so the person's own words lead, not the AI's.)
- **Share Page (friends):** "[Name] shared a sunset with you" → photo, nothing on it → title → story → reactions. No score.
- **Share images:** only the small logo mark in the top-left corner.
- **Right after saving:** the new entry opens. While scoring, a quiet "Scoring…" line sits where the Wow line goes, then the Wow line appears. No separate Score Result screen.
- **Why:** a number on the photo competes with the picture and tells neither the person nor their friends anything they care about. **Why the score stays at all:** it sets Sunset Soul apart, and how often people open Score details tells us whether they care about a score (the PRD's test).
- **Later idea:** Rare Sightings badges (e.g., "Sun rays", "Alpenglow") are a better candidate for the photo than a number, once that feature is built.

## 2. Adding a story: type first, or speak
Typing is the main way (most people will type); speaking is right below it. The AI helps only when asked. The three opening questions are no longer the first thing people see (they felt like a quiz before people had said anything).

- **New sunset, step one (B2a):** every New sunset button opens a screen with two large choices, **Choose from your photos** first ("A sunset you've already taken") and **Take a photo** second ("Opens the camera. The photo is saved in your Journal."), under the line "Add one you've already taken, or one you're watching now." (Order changed November 22, see section 9.) Then a note: "Older photos keep the date and place they were taken, so they land in the right spot in your Journal. You can change either one." **Cancel** goes back.
- **New sunset, step two (B2b):** the chosen photo, **Choose a different photo**, date taken and place (each with Change), then **Add your story** (main button, saves the entry first) with a small **Save for now** link underneath. No story box on this screen.
- **Button wording:** **Add your story** (not "Tell its story"). It's the person's own voice, feels light and optional, and works whether people type or speak.
- **Story screen heading:** **The story behind this moment** (not "this sunset" or "this photo": "moment" is warm, is what people remember, and still fits if the picture isn't a sunset). The rest of the app keeps "sunset" (New sunset, Save your first sunset, Louise shared a sunset with you).
- **Typing first:** a large box right under the heading with the hint *"Where were you, and what made you stop to take this?"*, and **Need ideas?** under it.
- **Voice below it:** a panel with a 64px round microphone button (secondary style, not the action color) and **"Rather talk than type?"** · *"Tell it in your own voice. We'll write it down, and you can hear it again later."* Chosen over "Or tell it out loud" (sounded like an instruction), "Tell it in your own voice", "Just talk. We'll write it down.", "Say it instead" and "Speak your story". It speaks to people who find typing on a phone a chore, and the second line points to hearing their voice again on Entry Detail.
- **Save** is the screen's one main button, with "Not ready? Save now and add your story any time." (Saving with an empty box saves without a story.)
- **First tap on the microphone (once only):** a short sheet over a soft navy shade (so the sheet clearly sits on top): **"Tell it in your own voice"** · "Your phone will ask if Sunset Soul can use the microphone. Tap Allow." · **"Your recording is private. You decide if friends hear it."** (changed November 22; was "recording stays private, friends never hear it") · AI turns what you say into text you can change. Buttons: **Continue**, **Type instead**. (Without it, the phone's own permission pop-up can feel alarming.)
- **While recording:** "Listening", a running timer, a gentle moving line (peach blush in dark mode, navy in light mode), a large **Stop** button ("Tap to stop"), and "Take your time. Pauses are fine. Up to 2 minutes."
- **After stopping (and in Edit):** a "Your recording · 0:48 · Private until you share it" row with play and **Add more** (records more), and under it **Delete recording (your words stay)**. Then the words in the box with "Here are your words. Change anything you like.", Need ideas? (closed until tapped), Help me polish it, the suggested title and **Save**. The note at the bottom reads "AI turned your recording into text and suggested the title. Your recording and story stay private until you share them."
- **Delete recording:** inside Edit on each entry, for the MVP. Deletes the audio only; the written story stays. (A "delete all recordings" option comes with Settings later.)
- **On Entry Detail:** if the story was spoken, a **"Hear it in your own voice · 0:48 · Private until you share it"** row with a play button, for the owner. On the Share Page only if the owner turns on **Include my voice** when sharing (added November 22).
- **"Need ideas?"** opens **Story ideas**: a short list of questions picked for this photo (e.g., "Who were you with?", "What happened right before?"). Closed by default; tapping one shows it above the box as a nudge; the person keeps telling it in their own words. These replace the three opening questions and the interview-first flow.
- **"Help me polish it"** appears once there are words. This is where the AI writing lives (My story / Crafted story, lengths). Optional, always after the person has said their piece.
- **No "Caption for sharing" box.** Share cards use the title and the start of the story.
- **Title:** suggested by AI, editable.
- **Edit:** no story yet → **Add your story**. With a story → the story plus a small **Edit** link. "What you wrote" / "What you said" and Delete recording live inside Edit.
- **Not doing:** a small mic inside the text box (too small for our readers), two buttons on New Sunset ("Say it" / "Write it", a decision too early) (voice from friends is now in the MVP as part of Two sides of the story, section 9).
- Removed labels: "Tell its story", "Save and tell its story", "Add more to my story", "Edit the story", "The story behind this sunset", "Or tell it out loud", "Tell your story out loud", and (November 22) "Your recording stays private. Friends never hear it." and "Only you can hear it".

## 3. Sharing is one button
- **Share** is the main button on Entry Detail. Tapping it creates the link (if needed) and opens the phone's share menu right away.
- The share-link box no longer sits open on every entry.
- **After sharing,** the row on Entry Detail reads **"See what friends sent"**, with "Shared · [n] reactions" on a second line (renamed November 22, section 9).
- **Link settings move into From your friends (internal name Afterglow):** Copy link, Place name to show (filled in from the entry's location, editable), Stop sharing.
- Sharing stays on Entry Detail for the MVP (one tap from the Journal, so people see what they send and the Journal stays calm). "Share several sunsets at once" is on the Later List. (November 22: a short Before you share step appears only when the photo has names or a spoken story; sharing every sunset with one person is a separate choice. Section 9.)

## 4. Reactions: four, with brand icons
- **The invitation on the Share Page:** heading **"Let [Name] know you saw it"** with **"Tap one or more, and add a note if you like."** underneath. Replaces "How did this sunset make you feel?" / "Tap a reaction to let [Name] know." (that asked about the friend; the new line invites a reply to the sender). Low pressure, fits happy and bittersweet stories, and quietly tells friends they can pick more than one. Considered: "Send Louise a reply", "Say something to Louise", "What would you like to tell Louise?". The thank-you after sending stays "Sent! [Name] will see your reaction."
- **Four reactions:** **Wow** · **Wish I was there** · **Love this!** · **Sending hugs** (new). The first three respond to the sunset; Sending hugs responds to the person and fits happy and bittersweet stories alike. Four is the limit.
- **Why "Sending hugs":** people actually say it, and it's clearly different from "Love this!". Considered and passed over: "Sending warmth" (people don't say it), "Sending love" (two "love" buttons), "So happy for you" (wrong for sad stories). Runner-up: "Thinking of you".
- **No emoji** (they look different on every phone, make the app feel like Facebook, and compete with the photo). Icons are simple line drawings in the Sunset Soul style: **Wow**, a small sun with rays fanning out (from the logo's beams); **Wish I was there**, a horizon with the sun dipping into it; **Love this!**, a heart; **Sending hugs**, a person with open arms (chosen over two people hugging, two suns side by side, and arms around a sun).
- **When tapped:** the button fills with peach blush, a small **checkmark** appears beside the count (so the choice doesn't rely on color alone), and the icon gives one short animation (rays spread, horizon glows, heart beats, arms open wide). Animation skipped when the phone asks for reduced motion.
- **Layout:** two rows of two on a phone, large tap targets.
- **Build note:** reactions were built for three; the fourth touches the Share Page, Afterglow totals and the counts. Replaces the sparkle / map pin / heart icons proposed in Phase 4d.

## 5. Navigation: New sunset at the top, Journal and You at the bottom
- **Top of every main screen:** the logo on the left, **36px tall** (up from 30px), and a **New sunset** button on the right: a rounded secondary button with a camera icon and the words "New sunset". It opens the choose-a-photo step (B2a). On Entry Detail and Afterglow the left side is the Back link instead of the logo. This is the one place to add a sunset.
- **Bottom bar:** two tabs, **Journal · You**, with a word under each icon (grid for Journal, person for You). No capture button in the bar, so New sunset isn't duplicated.
- **Journal is one tab** for both Stories and Photos (same sunsets, two ways to look), with the switch at the top of the Journal. The Journal remembers the last view used.
- **You** opens the account screen (first name, email, Sign out). The Save button appears only after the name is changed.
- **Where they show:** Journal (both views and empty), Entry Detail (including Score details), Afterglow and You. **Hidden** while doing a task: New sunset, the story screens, the microphone note, recording and the welcome screen (these keep Back or Cancel at the top). **Never** on the Share Page.
- **Growing later:** with Live Map the bar becomes Journal · Map · You; a Friends tab (all reactions in one place) can join later.

## 6. Fixes that come along
- **Welcome screen (first sign-in):** logo → **Welcome to Sunset Soul** → *"Your sunsets, your stories, shared with family and friends."* → **What's your first name?** · "Friends see it when you share a sunset." → a preview line ("Louise shared a sunset with you") → First name → **Continue**.
- **First name asked once, at first sign-in,** so the Share Page says "Louise shared a sunset with you" instead of "A sunset shared with you … let them know". Editable in You (account).
- **Photos view of the Journal** (labeled "All photos" until November 22): photos only, two columns of squares, grouped under month headings, a count beside the title ("15 sunsets"); tapping a photo opens the entry.
- **Date bug:** the Share Page showed August 21 for an entry dated August 22 in the Journal. Dates must match everywhere.
- **Place names in one form** everywhere ("Carlsbad, California", not sometimes "Carlsbad").
- **Every entry has a title.** Older entries without one get an AI-suggested title.
- **Entry Detail photo** goes full bleed at the top, per the design system.
- **Empty Journal** gets a clear "Save your first sunset" button.
- **Copyright line** ("© 2026 Sunset Soul. All rights reserved.") stays at the bottom of every screen, as the PRD requires; it isn't drawn in the designs.

## 7. Light mode
- Every app screen has a light-mode version on the canvas's **Light mode** page, in the same position as its dark twin. Light mode follows the phone's setting; dark is the brand default.
- Built from the design system's light values: cream page, navy text, Mist cards and fields, the darker ocean blue for main buttons, the light version of the logo. Apricot and peach blush are fills only; links and labels are navy.
- The recording screen's moving line is navy in light mode (peach blush nearly disappears on cream).
- Noted, not changed: the Mist cards are slightly cool against warm cream; a warmer card color is an option later. In dark mode the ocean-blue main buttons are fairly quiet on navy, by design (buttons are identified by their words, and the photos stay brightest).

## 8. States (described in the Build Spec, not drawn)
- "Scoring…" right after saving.
- The friend's first-name prompt on the Share Page and the "Sent!" confirmation.
- Something went wrong: no connection, photo won't upload, AI unavailable (always "your sunset is saved").
- Microphone denied: a plain sentence, and the typing box stays ready.
- What the Afterglow row says after Stop sharing.

## 9. November 22, 2026 updates
Requirements are in PRD section 6.10; build instructions and screens are in the [Sunsets Together Build Spec](sunset-soul-build-spec-sunsets-together.md) and [design/screens](design/screens/README.md).

**Sunsets Together (new in the MVP).** People like to be in their sunset photos, and those photos are likely shared more.
- **The AI notices people; the user names them.** No face recognition at any stage. "Who's in this one?" (optional names with chips) on the story screen when the AI sees people. Only the user sees names.
- **Journal filter:** **All · With people · Pure sunset** under the **Stories · Photos** switch, in both views. Opens on Stories and All. Name chips under With people open **Sunsets with [Name]**. "Pure sunset" was chosen over "Just the sky" (sounded lesser) and "Views".
- **Sunsets with [Name]:** every sunset with one person; **"Send Steve all your sunsets together"** sends one link after a review step (all checked to start). One set of reactions for the whole set. Sharing one sunset from Entry Detail stays the default.
- **Before you share:** "Who are you sending this to?" (name chips plus Someone else) and **Include my voice** (off by default). Appears only when the photo has names or a spoken story.
- **Personal link:** "Steve, you're in Louise's sunset"; Steve sees **"I was there!"** in place of "Wish I was there" (still four reactions) and isn't asked his name.
- **Two sides of the story:** every friend can add a memory on the Share Page, **type it or say it** (spoken up to 1 minute). One Send button for reactions, note and memory. Only the owner sees or hears it ("Steve's memory", marked "Private to you"), on Entry Detail and From your friends.
- **Share it in your own voice:** Include my voice puts "Hear Louise tell it" on the Share Page.
- **Public map (later phase):** photos with people stay off by default; photos of children are never allowed.

**Wording and naming**
- **Voice privacy:** "Private until you share it" (recording rows), "Your recording is private. You decide if friends hear it." (microphone sheet), "Your recording and story stay private until you share them." (story screen note), "Private to you" (friends' memories). Replaces "Only you can hear it", which described who can listen rather than what people care about.
- **Afterglow renamed:** the screen is titled **"From your friends"**; the row on Entry Detail is **"See what friends sent"** with the status on its own line so it never wraps at large text sizes. "Afterglow" stays the internal name. Chosen over "Comments" (sounds public, and the screen holds more than comments), "See who replied" and "See their reactions".
- **Journal switch:** **Stories · Photos** (was "Stories · All photos"; avoids "just photos" and a clash with the filter's "All").

**New sunset**
- **Choose from your photos first,** Take a photo second: people take sunsets with the phone's own camera (fast, several shots, kept in their library) and add the best one later.
- **No extra save step:** a web app can't save to the phone's photo library on its own, and a "Save to your photos" step after every photo was tried and dropped because it slowed people down. Automatic saving comes with a native app (Later List).

**Canvas tidy-up:** the reaction icon comparison boards were removed; the chosen sunset-style icons and the open-arms Sending hugs icon are on every screen that uses them.

