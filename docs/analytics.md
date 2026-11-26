# Analytics (Phase 7a)

PostHog, sent from the server only (`apps/web/src/lib/analytics.ts`). No script in the browser, no
analytics cookie, nothing for ad blockers to block, so the numbers are complete.

**What's sent:** an event name, an opaque id, and yes/no facts or counts. **Never** a name, email,
story, title, place, location, photo or recording. Events from headless Chrome (our smoke tests) and
link-preview bots are skipped. Without `POSTHOG_KEY`, nothing is sent.

## Set up (once, owner)

1. Create a PostHog Cloud project (free tier). US or EU: pick EU if most beta testers are in Europe.
2. Project settings → copy the **Project API key** (starts `phc_`).
3. Add it to the staging Worker:
   ```sh
   cd apps/web
   npx wrangler secret put POSTHOG_KEY          # paste the phc_ key
   npx wrangler secret put POSTHOG_HOST         # only for an EU project: https://eu.i.posthog.com
   ```
   Secrets take effect at once; no deploy needed.
4. Save a sunset on staging and check it appears in PostHog → Activity within a minute.
5. In PostHog project settings, turn **off** session replay, autocapture and heatmaps (we don't send
   browser events, so they'd only be noise) and set **Discard client IP data** on.

## Events

| Event | Id | Properties |
|---|---|---|
| `signed_up` | user | `from_share` (came from "Start your own Journal" in the last day) |
| `entry_saved` | user | `entry_id`, `has_location` |
| `story_saved` | user | `entry_id`, `has_people`, `people_count`, `has_story`, `has_voice`, `first_story`, `words` (a range) |
| `story_polished` | user | `entry_id`, `style` |
| `names_added` | user | `entry_id`, `names` (how many, never the names) |
| `journal_filtered` | user | `show` (`people` or `pure`), `view`; only when a filter is picked, not on plain visits |
| `entry_shared` | user | `entry_id`, `share_id`, `has_people`, `people_count`, `has_story`, `has_voice`, `personal` (a link for someone named in the photo), `include_voice` (every Share tap) |
| `share_page_viewed` | friend's visitor id, or a random one | `share_id`, `entry_id`, the people/story facts, `returning_friend`, `personal`, `voice_included` (not the owner, not bots) |
| `share_signup_tapped` | as above | `share_id` |
| `reaction_received` | friend's visitor id | `share_id`, `entry_id`, `kind`, `personal` (`wish` on a personal link is "I was there!"), the people/story facts |
| `note_received` | friend's visitor id | `share_id`, `entry_id`, the people/story facts |
| `story_added` | friend's visitor id | `share_id`, `entry_id`, `spoken` (a recording is kept with it), `personal`, the people/story facts. Sent when a friend taps Send on Add to the story (4f-4), including changes |
| `data_exported` | user | `sunsets` |
| `account_deleted` | user | none |

`has_people` is null until the scorer (v2.1+) has looked at the photo; it normally has by the time a
story is saved or a sunset shared.

## The PRD's metrics, as PostHog insights

| PRD metric | Insight |
|---|---|
| New users who save a 2nd entry within 7 days | Funnel: `signed_up` → `entry_saved` → `entry_saved`, conversion window 7 days |
| Entries with a story | `story_saved` with `first_story = true`, unique `entry_id` ÷ `entry_saved` count |
| Entries shared | `entry_shared` unique `entry_id` ÷ `entry_saved` count |
| Shared entries with a reaction | `reaction_received` unique `entry_id` ÷ `entry_shared` unique `entry_id` |
| Share page → "Start your own Journal" | `share_signup_tapped` ÷ `share_page_viewed`; and `signed_up` where `from_share = true` |
| Entries per active user per week | `entry_saved` total ÷ weekly active users |
| **With people vs. without (the main test)** | The share and reaction rates above, broken down by `has_people` |
| Shares that include voice | `entry_shared` with `include_voice = true` ÷ `entry_shared` with `has_voice = true` |
| "Start your own Journal" for people named in a photo vs. other friends | `share_signup_tapped` and `share_page_viewed` broken down by `personal` |
| Photos with people where names are added | `names_added` unique `entry_id` ÷ entries with `has_people = true` (or `story_saved` with `has_people = true` and `names_count > 0`) |
| Use of the With people filter | `journal_filtered` with `show = people`, unique users |

Every entry fact set also carries `names_count`.

Not tracked yet: map posts (Phase 6), opening Sunsets with [Name] (4f-5 adds it with shared sets), friends' memories (4f-4), and the Story
Capture details that happen only in the browser (opening "Need ideas?", playing a recording). Add them
with the feature, from the server where possible.

Your own and Louise's testing shows up as users; filter those accounts out by distinct id (the user id
on `/admin/users`) if they skew the numbers.
