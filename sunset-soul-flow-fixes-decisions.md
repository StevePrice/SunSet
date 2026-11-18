# Sunset Soul — MVP Flow Fixes (decisions and reasons)
**Status:** Agreed with Louise, November 8, 2026. This is the record of *what* was decided and *why*. The build instructions are in the [Build Spec](sunset-soul-build-spec-flow-fixes.md); later ideas are in the [Later List](sunset-soul-later-list.md).
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

- **New sunset, step one (B2a):** every New sunset button opens a screen with two large choices, **Take a photo** ("Opens your camera") and **Choose from your photos** ("A sunset you took earlier"), and a note: "Older photos keep the date and place they were taken, so they land in the right spot in your Journal. You can change either one." **Cancel** goes back.
- **New sunset, step two (B2b):** the chosen photo, **Choose a different photo**, date taken and place (each with Change), then **Add your story** (main button, saves the entry first) with a small **Save for now** link underneath. No story box on this screen.
- **Button wording:** **Add your story** (not "Tell its story"). It's the person's own voice, feels light and optional, and works whether people type or speak.
- **Story screen heading:** **The story behind this moment** (not "this sunset" or "this photo": "moment" is warm, is what people remember, and still fits if the picture isn't a sunset). The rest of the app keeps "sunset" (New sunset, Save your first sunset, Louise shared a sunset with you).
- **Typing first:** a large box right under the heading with the hint *"Where were you, and what made you stop to take this?"*, and **Need ideas?** under it.
- **Voice below it:** a panel with a 64px round microphone button (secondary style, not the action color) and **"Rather talk than type?"** · *"Tell it in your own voice. We'll write it down, and you can hear it again later."* Chosen over "Or tell it out loud" (sounded like an instruction), "Tell it in your own voice", "Just talk. We'll write it down.", "Say it instead" and "Speak your story". It speaks to people who find typing on a phone a chore, and the second line points to hearing their voice again on Entry Detail.
- **Save** is the screen's one main button, with "Not ready? Save now and add your story any time." (Saving with an empty box saves without a story.)
- **First tap on the microphone (once only):** a short sheet over a soft navy shade (so the sheet clearly sits on top): **"Tell it in your own voice"** · "Your phone will ask if Sunset Soul can use the microphone. Tap Allow." · recording stays private, friends never hear it · AI turns what you say into text you can change. Buttons: **Continue**, **Type instead**. (Without it, the phone's own permission pop-up can feel alarming.)
- **While recording:** "Listening", a running timer, a gentle moving line (peach blush in dark mode, navy in light mode), a large **Stop** button ("Tap to stop"), and "Take your time. Pauses are fine. Up to 2 minutes."
- **After stopping (and in Edit):** a "Your recording · 0:48 · Only you can hear it" row with play and **Add more** (records more), and under it **Delete recording (your words stay)**. Then the words in the box with "Here are your words. Change anything you like.", Need ideas? (closed until tapped), Help me polish it, the suggested title and **Save**.
- **Delete recording:** inside Edit on each entry, for the MVP. Deletes the audio only; the written story stays. (A "delete all recordings" option comes with Settings later.)
- **On Entry Detail:** if the story was spoken, a **"Hear it in your own voice · 0:48"** row with a play button, only for the owner. Never on the Share Page.
- **"Need ideas?"** opens **Story ideas**: a short list of questions picked for this photo (e.g., "Who were you with?", "What happened right before?"). Closed by default; tapping one shows it above the box as a nudge; the person keeps telling it in their own words. These replace the three opening questions and the interview-first flow.
- **"Help me polish it"** appears once there are words. This is where the AI writing lives (My story / Crafted story, lengths). Optional, always after the person has said their piece.
- **No "Caption for sharing" box.** Share cards use the title and the start of the story.
- **Title:** suggested by AI, editable.
- **Edit:** no story yet → **Add your story**. With a story → the story plus a small **Edit** link. "What you wrote" / "What you said" and Delete recording live inside Edit.
- **Not doing:** a small mic inside the text box (too small for our readers), two buttons on New Sunset ("Say it" / "Write it", a decision too early), voice notes from friends (on the Later List).
- Removed labels: "Tell its story", "Save and tell its story", "Add more to my story", "Edit the story", "The story behind this sunset", "Or tell it out loud", "Tell your story out loud".

## 3. Sharing is one button
- **Share** is the main button on Entry Detail. Tapping it creates the link (if needed) and opens the phone's share menu right away.
- The share-link box no longer sits open on every entry.
- **After sharing,** the Afterglow row reads "Shared · [n] reactions".
- **Link settings move into Afterglow:** Copy link, Place name to show (filled in from the entry's location, editable), Stop sharing.
- Sharing stays on Entry Detail for the MVP (one tap from the Journal, so people see what they send and the Journal stays calm). "Share several sunsets at once" is on the Later List.

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
- **Journal is one tab** for both Stories and All photos (same sunsets, two ways to look), with the switch at the top of the Journal. The Journal remembers the last view used.
- **You** opens the account screen (first name, email, Sign out). The Save button appears only after the name is changed.
- **Where they show:** Journal (both views and empty), Entry Detail (including Score details), Afterglow and You. **Hidden** while doing a task: New sunset, the story screens, the microphone note, recording and the welcome screen (these keep Back or Cancel at the top). **Never** on the Share Page.
- **Growing later:** with Live Map the bar becomes Journal · Map · You; a Friends tab (all reactions in one place) can join later.

## 6. Fixes that come along
- **Welcome screen (first sign-in):** logo → **Welcome to Sunset Soul** → *"Your sunsets, your stories, shared with family and friends."* → **What's your first name?** · "Friends see it when you share a sunset." → a preview line ("Louise shared a sunset with you") → First name → **Continue**.
- **First name asked once, at first sign-in,** so the Share Page says "Louise shared a sunset with you" instead of "A sunset shared with you … let them know". Editable in You (account).
- **All photos view of the Journal:** photos only, two columns of squares, grouped under month headings, a count beside the title ("15 sunsets"); tapping a photo opens the entry.
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
