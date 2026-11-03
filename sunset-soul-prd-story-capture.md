# Sunset Soul — Feature PRD: AI Story Capture
**Status:** Draft — Phase 2 (first LLM feature)
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
- % of story sessions that use voice vs. typing (goal: voice is the majority)
- Average story length and richness for spoken vs. typed sessions
- Average number of follow-up questions answered per session
- % of users who tap "Ask me something else" (signal of question quality)
- Distribution of final style chosen (My story / Crafted story)
- % of users who play back a recording or view their original words
- % of AI-written stories edited by hand, and how heavily (signal of voice accuracy)
- % of entries with a story that are shared out, vs. entries without a story
- 7-day repeat entry rate for users who use AI Story Capture vs. those who don't

## 5. User Stories

- As a user, I want to tell the story of my sunset by speaking, so I don't have to type on my phone.
- As a user, I want to type my story instead, when speaking out loud isn't practical.
- As a user, I want a few suggested questions to start with, so I'm not facing a blank screen.
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
- After a photo is captured or selected, the New Entry screen opens with the story area front and center.
- **Speaking is the encouraged way to tell a story.** People share more naturally, with more detail and more of their own voice, when they talk than when they type on a phone.
- The **mic button is the primary, most prominent action** on the New Entry and Interview screens. Typing is always available but visually secondary (e.g., a smaller "Type instead" option).
- A short, friendly cue invites speaking (e.g., "Just tell me about it, like you'd tell a friend").
- The user can switch between speaking and typing at any time mid-session, and typing is never hidden or hard to find (some users can't or won't speak aloud, e.g., in public or for accessibility).
- The user can skip the story entirely and save the entry with just the photo. A story is never required.
- AI story help can be turned off in Settings. When off, the New Entry screen behaves as in the MVP (plain text caption with one static prompt).

### 6.2 Opening Questions
- Before the user says anything, the app shows **three opening questions** tailored to the photo (for example, based on whether it shows water, people, a city skyline, or a car window).
- The user taps one question to answer it, or ignores them and simply starts talking or typing.
- The user can tap **"Ask me something else"** to replace the three opening questions with a new set.
- If the photo can't be analyzed (e.g., poor connection), a fixed set of three general opening questions is shown instead.
- See the Interviewer Guide for question style and examples.

### 6.3 Follow-Up Questions
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
- When the user speaks, the app records audio and transcribes it to text.
- The audio is **always saved** with the journal entry (private by default) and can be played back from Entry Detail.
- Each answer in the session is saved as part of one combined recording or as linked clips (engineering to decide; the user experience should feel like one recording).
- Recommended maximum recording length per answer: ~2 minutes (tunable).
- Users can delete a recording from Entry Detail, and can delete all recordings from Settings.
- Recordings are never shared publicly or included in share-out unless a future feature explicitly allows it with user permission.

### 6.5 Written Story Styles
After the interview ends, the app generates the written story. The user chooses between **two styles** and can switch at any time:

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
- Where available, visual elements detected by the Scoring Algorithm (e.g., sun rays or reflection for the Wow Factor) should be passed to the story generator, so the story and score feel connected.
- My story and the original words never include photo details; they use only what the user said.

### 6.7 Title and Caption
- For every story, the app automatically suggests:
  - A **title** (2–6 words)
  - A **one-line caption** (used on the share card and, if posted, the Live Map)
- Both are editable.

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

1. User captures or selects a sunset photo.
2. New Entry screen opens with three opening questions and options to speak or type.
3. User picks a question (or starts freely) and answers by voice or typing.
4. AI asks one follow-up question. User answers, taps "Ask me something else," or taps "That's my story."
5. Step 4 repeats up to three times.
6. App shows the written story in **My story** style, with a suggested title and caption.
7. User can switch to Crafted story, change length, toggle photo details, or edit by hand.
8. User saves. Entry is scored (per MVP) and added to the Journal with the story, recording, and original words.
9. Later, from Entry Detail, the user can play the recording and read "What you said" (or "What you wrote" for typed stories).

## 8. Screens (new or changed)

1. **New Entry (changed)** — photo, three opening questions, large mic button (primary), "Type instead" option (secondary), skip option
2. **Interview (new)** — current question, answer area (large mic button as primary, "Type instead" as secondary), "Keep going" (primary), "Ask me something else," "That's my story"
3. **Your Story (new)** — "Add more to my story" option, written story with style switcher (My story / Crafted story), length control, "Add details from my photo" toggle (Crafted only), title and caption fields, edit, save
4. **Entry Detail (changed)** — adds the recording player with "What you said" transcript underneath (or "What you wrote" for typed stories), and access to both story versions
5. **Settings (changed)** — AI story help on/off, delete all recordings, data and privacy explanation

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
