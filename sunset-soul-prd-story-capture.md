# Sunset Soul — Feature PRD: AI Story Capture
**Status:** Draft — Phase 2 (first LLM feature). **Revised November 8, 2026:** typing comes first and the AI helps only when asked; voice sits right below the typing box; story ideas replace the opening questions and the interview-first flow; no caption field. Screens and copy: `sunset-soul-build-spec-flow-fixes.md` (3.7–3.9).
**Companion docs:**
- Sunset Soul – Product Requirements Document, MVP (sunset-soul-prd.md)
- Sunset Soul – Concept & Strategy (sunset-soul-concept.md)
- Sunset Soul – AI Story Interviewer Guide (sunset-soul-interviewer-guide.md)

---

## 1. Overview

AI Story Capture helps users turn a sunset photo into a meaningful memory by making it easy to tell the story behind it. The user speaks or types, a gentle AI interviewer helps them go a little deeper with a few well-chosen questions, and the app turns what they shared into a written story in the style they choose.

In the MVP, a story is an optional text caption with one static prompt ("What was happening when you took this?"). Most people will type a few words or nothing at all. This feature removes the blank-screen problem and makes the story, the emotional core of Sunset Soul, effortless to capture.

## 2. Why This Feature First

- **The story is the product's differentiator.** No competitor combines sunset capture with a story-driven memory. Making stories easier and richer strengthens the core of the concept.
- **It supports the MVP's core hypothesis.** Better stories make the Journal more valuable, which gives users a reason to keep coming back.
- **It makes sharing more compelling.** A share card with a beautifully told story is more likely to be sent and appreciated than a photo alone.
- **It lays the groundwork** for later LLM features: journal insights, year-end recaps, the Story Feed, and printed photo books.

## 3. Goals

- Increase the share of entries that include a story
- Increase the depth of stories (more than a one-line caption)
- Deliver a "wow" moment when users see their story written well, without losing their own voice
- Keep the experience quick: the full flow should take about 1–2 minutes

## 4. Success Metrics (draft — refine before build)

- % of saved entries that include a story (compare to MVP baseline)
- % of story sessions that use voice vs. typing (typing is expected to be the majority; voice is offered right below it)
- Average story length and richness for spoken vs. typed sessions
- Average number of follow-up questions answered per session
- % of story sessions that open "Need ideas?", and how often a story idea is tapped (signal of question quality)
- Distribution of final style chosen (My story / Crafted story)
- % of users who play back a recording or view their original words
- % of AI-written stories edited by hand, and how heavily (signal of voice accuracy)
- % of entries with a story that are shared out, vs. entries without a story
- 7-day repeat entry rate for users who use AI Story Capture vs. those who don't

## 5. User Stories

- As a user, I want to tell the story of my sunset by speaking, so I don't have to type on my phone.
- As a user, I want to type my story instead, when speaking out loud isn't practical.
- As a user, I want story ideas when I'm stuck, so I'm not facing a blank screen, without questions getting in the way when I already know what to say.
- As a user, I want the app to ask me a follow-up question about what I said, so I remember and capture more of the moment.
- As a user, I want to skip a question I don't like and get a different one.
- As a user, I want to stop whenever I feel my story is complete.
- As a user, I want to choose how my story is written: lightly polished in my own voice, or crafted into a well-written story.
- As a user, I want to see my original words, exactly as I said or typed them, so nothing I shared is ever lost.
- As a user, I want the written story to sound like me and include only what really happened.
- As a user, I want my voice recording saved with the entry, so I can hear myself tell the story years from now.
- As a user, I want to edit any version of my story by hand.
- As a user, I want to be able to delete my voice recordings.

## 6. Functional Requirements

### 6.1 Entry Point
- After a photo is chosen, New sunset shows **Add your story** (main button) and **Save for now** (link). Add your story saves the entry first, then opens **The story behind this moment**.
- **Typing comes first** (decided Nov 8, 2026: most people will type). A large typing box sits right under the heading, with the hint *"Where were you, and what made you stop to take this?"*
- **Voice sits right below it:** a panel with a round microphone button (secondary style, not the screen's main button), **"Rather talk than type?"** and *"Tell it in your own voice. We'll write it down, and you can hear it again later."*
- The user can switch between speaking and typing at any time.
- **Save** is the screen's main button. The user can skip the story entirely ("Not ready? Save now and add your story any time."). A story is never required.
- AI story help can be turned off in Settings. When off, the New Entry screen behaves as in the MVP (plain text caption with one static prompt).

### 6.2 Story Ideas (replaces Opening Questions)
- Questions are **not** shown up front. A **"Need ideas?"** link under the typing box opens **Story ideas**: three questions tailored to the photo (for example, based on whether it shows water, people, a city skyline, or a car window).
- Tapping a question shows it **above the box** as a nudge; the user keeps telling the story in their own words.
- **"More ideas"** replaces the three with a new set.
- If the photo can't be analyzed (e.g., poor connection), a fixed set of three general questions is shown instead.
- See the Interviewer Guide for question style and examples.

### 6.3 Follow-Up Questions
**Revised Nov 8, 2026: not part of the main flow.** Story ideas (6.2) replace the interview. The follow-up behavior below is kept for reference and may return later (for example, inside Story ideas).

- After the user answers, the AI asks **one follow-up question at a time**, based on what the user just said.
- Maximum of **3 follow-up questions** per session (exact number tunable post-launch).
- Three clear options are always visible during the interview:
  - **"Keep going"** — the primary, most prominent action after each answer. Shows the next follow-up question so the user knows the interview can continue.
  - **"Ask me something else"** — replaces the current follow-up question with a different one.
  - **"That's my story"** — ends the interview and moves to the written story.
- **Design requirement (from early user testing):** after answering a question, a tester didn't know how to get another question and ended the interview early. The next step must always be obvious. After each answer, the screen should clearly show that another question is available (e.g., the next question appears automatically, or a prominent "Keep going" button), with "That's my story" as a secondary option.
- Even after the written story is shown, the user should be able to return to the interview and keep adding to the story (e.g., a "Add more to my story" option on the Your Story screen).
- Questions appear as **text on screen**. The AI does not speak questions out loud (users may be in public).
- If the user shares something painful (grief, illness, loss, a hard time), the interviewer becomes gentler and may end the interview sooner. See the Interviewer Guide.

### 6.4 Voice Recording
- **First tap on the microphone (once per person):** a short sheet before the phone's own permission prompt: "Tell it in your own voice" · "Your phone will ask if Sunset Soul can use the microphone. Tap Allow." · "Your recording stays private. Friends never hear it." · "AI turns what you say into text you can change." · **Continue** / **Type instead**.
- **While recording:** "Listening", a timer, a gentle moving line, a large **Stop** button, "Take your time. Pauses are fine. Up to 2 minutes." Recording stops on its own at 2 minutes.
- When the user stops, the transcript appears in the box to change ("Here are your words. Change anything you like."), with a "Your recording · 0:48 · Only you can hear it" row (play, **Add more**).
- When the user speaks, the app records audio and transcribes it to text.
- The audio is **always saved** with the journal entry (private by default) and can be played back from Entry Detail ("Hear it in your own voice").
- If the microphone is denied, the typing box stays ready with a plain explanation.
- Each answer in the session is saved as part of one combined recording or as linked clips (engineering to decide; the user experience should feel like one recording).
- Recommended maximum recording length per answer: ~2 minutes (tunable).
- Users can delete a recording in **Edit** on each entry (**"Delete recording (your words stay)"**: the audio goes, the written story stays). Delete all recordings comes with Settings, later.
- Recordings are never shared publicly or included in share-out unless a future feature explicitly allows it with user permission.

### 6.5 Written Story Styles
Writing help is optional: a **"Help me polish it"** link appears once there are words, and opens the written styles. The user chooses between **two styles** and can switch at any time:

| Style | What it is | Default? |
|---|---|---|
| **My story** | First-person, **light polish**. Tidies grammar and flow, trims rambling, but keeps the user's own phrases, details, and personality. Reads as if they wrote it carefully. | **Yes** |
| **Crafted story** | First-person, well-written short story with a strong opening, vivid but accurate detail, and a satisfying ending. Built only from the user's facts, plus details clearly visible in the photo (see 6.6). | No |

- **Length options** for My story: one-line caption, short paragraph, or fuller story. Default: short paragraph.
- Each style is generated on first view and saved, so switching back and forth is instant after the first time.
- The user can **edit either version by hand.** Hand edits are preserved; regenerating a style asks for confirmation before overwriting edits.
- The style the user has selected when they save is the one shown in the Journal, Entry Detail, and share card. The other version remains available.
- Third-person style is out of scope (see Section 9).

### 6.5a Original Words
The user's original words are **not a story style.** They live alongside the recording, so the user can always see exactly what they shared.
- **Spoken stories:** Entry Detail shows the recording with a play button and, underneath, **"What you said"**: a transcript with filler words ("um," "uh," repeats, false starts) removed and punctuation and paragraphs added. Nothing else changes.
- **Typed stories:** the same spot shows **"What you wrote"**: the user's original typed text, unchanged.
- **Mixed (some answers spoken, some typed):** show them together in the order they were given, with a play button for the spoken parts.
- The interviewer's questions are not included. Corrections the user made to the interviewer are left out (see 6.8a).
- Original words are private and are never used on the share card or Live Map.

### 6.6 Photo Details in the Crafted Story
- The Crafted story may include details **clearly visible in the photo**: colors, clouds, water, reflections, sun rays, silhouettes of mountains, trees, buildings, or people.
- It must never guess from the photo: who people are, how anyone felt, or the exact location.
- An **"Add details from my photo"** toggle appears with the Crafted story. Default: on.
- Where available, the Wow reason line from the Scoring Algorithm should be passed to the story generator, so the story and score feel connected.
- If the scoring recognizes an iconic landmark (Wow driver: "an icon seen in a new light"), the Crafted story names it only if the user mentioned it or tagged the location.
- My story and the original words never include photo details; they use only what the user said.

### 6.7 Title and Caption
- For every story, the app automatically suggests a **title** (2–6 words), which is editable ("Suggested from your photo and story. Change it if you like.").
- **No caption field** (removed Nov 8, 2026). Share cards use the title and the start of the story.

### 6.8 Accuracy Rules (all styles)
- Never invent facts, events, people, feelings, or sensory details the user didn't share (photo details in the Crafted story are the only exception, per 6.6).
- Never change the meaning of what the user said.
- Never add advice, opinions, or commentary.
- The Crafted story should keep at least one or two of the user's own phrases word for word.
- Full writing rules are in the Interviewer Guide.

### 6.8a Details Shared During the Interview
- Anything the user says during the interview counts as their fact and can be used in any style, including details that confirm something in the photo (e.g., the user mentions their car's headlights, so the Crafted story can describe them).
- Corrections the user makes to the interviewer (e.g., "No, it was our first road trip, not our first evening") are applied to the story but are not included as text in the original words ("What you said" / "What you wrote").

### 6.9 Privacy and Data
- Recordings, transcripts, and stories are private by default, like all journal entries.
- Users are told clearly, at first use, that their photo, recording, and words are processed by an AI service to create questions and stories.
- AI providers must not use Sunset Soul user content to train their models (contractual requirement).
- Before any story is posted publicly (Live Map, future Story Feed), a privacy check should flag names, addresses, phone numbers, and other identifying details for the user to review. (Required once public story features launch.)

### 6.10 Failure Handling
- If transcription fails, the recording is still saved and the user can retry or type instead.
- If the AI is unavailable, the user can still type a story and save the entry; AI features can be applied later from Entry Detail.
- No entry should ever be lost because of an AI error.

## 7. User Flow

1. User chooses or takes a photo on New sunset and taps **Add your story** (the entry is saved first), or **Save for now**.
2. **The story behind this moment** opens: typing box first, **Need ideas?** under it, **Rather talk than type?** below.
3. User types, or taps the microphone (first time: the microphone note), speaks, and taps Stop. Their words appear in the box.
4. Optionally: **Need ideas?** for a question to nudge them, **Add more** to record more, **Help me polish it** for My story / Crafted story.
5. User checks the suggested title and taps **Save**. The entry opens with the title, date and place, Wow line, story and (if spoken) "Hear it in your own voice".
6. Later, **Edit** on Entry Detail reopens the same screen with the recording, "What you said" or "What you wrote", and **Delete recording**.

## 8. Screens (new or changed)

Designs: boards B2–B4 on https://claude.ai/artifact/XCsz8MDaV7vdQPb6UM5Wd2 (dark and light).

1. **New sunset (changed)** — photo, date and place, **Add your story** (main), **Save for now**
2. **The story behind this moment (changed)** — typing box first, Need ideas?, Rather talk than type? (microphone), Save
3. **Microphone note (new)** — shown once before the phone's permission prompt
4. **Recording (new)** — Listening, timer, moving line, Stop
5. **Review and Edit (new)** — recording row (play, Add more, Delete recording), words in the box, Need ideas?, Help me polish it (My story / Crafted story, lengths, photo details), title, Save
6. **Entry Detail (changed)** — "Hear it in your own voice" row under the story; Edit opens the review screen
7. **Settings (later)** — AI story help on/off, delete all recordings, data and privacy explanation

## 9. Out of Scope for This Feature

- Third-person story style (possible future "book mode")
- "My words" as a selectable story style (original words are shown with the recording instead; see 6.5a)
- Open-ended chat with the AI
- AI speaking questions out loud
- Translation of stories into other languages
- Journal-wide insights, recaps, and "on this day" features (later LLM features)
- Public Story Feed
- Printed photo books (though this feature should store everything a book would need: story, photo, and recording)

## 10. Dependencies

- **Speech-to-text service** for transcribing recordings
- **LLM with image understanding** (e.g., Claude) for opening questions, follow-up questions, story writing, title, and caption
- Account and Journal infrastructure from the MVP
- Scoring Algorithm output (for connecting photo details to the Crafted story)
- Secure storage for audio files

## 11. Cost Considerations

- Each session uses several AI calls (opening questions, follow-ups, transcription, story generation, plus each additional style requested).
- Generating the Crafted story only when viewed (not upfront) reduces cost.
- Crafted story is the most expensive and most impressive output, making it a natural candidate for the premium tier. Decision pending (see Open Questions).

## 12. Inspiration and Lessons from Other Apps

- **Remento** — turns spoken stories into written ones in several styles and keeps the original recording linked to the story. Lesson: offer a choice of styles and always keep the voice. Some users felt AI-rewritten stories didn't sound like the real person, which is why accuracy rules and a light-polish default matter.
- **Rosebud** — asks personalized follow-up questions based on what the user has written. Lesson: a few good follow-up questions can unlock surprisingly deep reflection.
- **Storii** — offers a light AI rewrite that improves flow while staying true to the user's voice. Lesson: the basis for the "My story" default.
- **Apple Journal** — suggests moments to write about based on photos and activity. Lesson: context-aware prompts remove the blank-page problem. Engineering should explore Apple's Journaling Suggestions API for future use.
- **StoryCorps** — the model for warm, simple, open interview questions.

## 13. Early Testing Notes

**Test session 1 (Nov 2026)** — a founder told a real sunset memory (Sequoia National Park) to Claude acting as the interviewer, using the Interviewer Guide. Full session in the Interviewer Guide, Section 8.

- **Follow-up questions found the real story.** The first answer was about the trees. The most meaningful parts (who she was with, that it was their first road trip together, and the happy, calm feeling she wanted to remember) only came out through follow-up questions. Strong evidence for the feature.
- **The next step wasn't obvious.** The tester didn't know how to get another question and ended the interview early. Led to the "Keep going" requirement in 6.3.
- **The interviewer introduced a wrong fact.** A follow-up question paraphrased "first road trip together" as "first evening together." Led to a new Interviewer Guide rule: questions must reuse the user's own words for key facts.
- **Speaking produced better stories.** The tester spoke all of her answers rather than typing them. The answers were natural, detailed, and full of her own phrases ("standing like sticks," "eye-catching, magical"). Led to the requirement in 6.1 that speaking is the encouraged, primary way to tell a story.
- **Corrections and confirmed details worked well** and are now captured in 6.8a.
- **All three story versions were well received** by the tester. Afterward, the choice was simplified to two story styles (My story and Crafted story), with the original words moved alongside the recording (6.5a). Picking between two is simpler, and the original words fit naturally with playback.

## 14. Open Questions

- [ ] Free vs. premium: Is Crafted story (or the whole AI feature) part of a premium tier? How many free sessions?
- [ ] Length options for Crafted story: single length, or the same three options as My story?
- [ ] Should a follow-up question begin with a brief acknowledgment of what the user said (e.g., "That sounds like a special night.") or go straight to the question?
- [ ] Exact maximum number of follow-up questions (placeholder: 3)
- [ ] When a user's first answer is short and they tap "That's my story," should the app offer one gentle follow-up before finishing, or end right away? (Test session 1 suggests offering one: the most meaningful details came from follow-ups.)
- [ ] Maximum recording length per answer (placeholder: ~2 minutes)
- [ ] Languages supported at launch (English only, or English and Spanish?)
- [ ] Where the recording plays from on the share card, if at all (e.g., a link for recipients)
- [ ] Which AI provider(s) to use, and data retention terms
