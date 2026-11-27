// Builds (or updates) the "Sunset Soul — PRD metrics" dashboard in PostHog: one SQL insight per
// metric in docs/analytics.md. Safe to run again: insights are matched by name and updated.
//
//   read -s POSTHOG_PERSONAL_API_KEY && export POSTHOG_PERSONAL_API_KEY   # paste the phx_ key
//   POSTHOG_PROJECT_ID=12345 node scripts/posthog-dashboard.mjs --check  # run the queries, print results, save nothing
//   POSTHOG_PROJECT_ID=12345 node scripts/posthog-dashboard.mjs          # save the dashboard
//
// POSTHOG_PERSONAL_API_KEY: a personal API key (PostHog → Settings → Personal API keys) with the
//   scopes query:read, insight:write and dashboard:write, limited to this project.
// POSTHOG_PROJECT_ID: the number in the PostHog URL (/project/12345/...).
// POSTHOG_APP_HOST: https://us.posthog.com (default) or https://eu.posthog.com for an EU project.
// EXCLUDE_IDS: optional, comma-separated distinct ids (user ids from /admin/users) to leave out,
//   e.g. your own and Louise's test accounts.

const key = process.env.POSTHOG_PERSONAL_API_KEY;
const project = process.env.POSTHOG_PROJECT_ID;
const host = (process.env.POSTHOG_APP_HOST || "https://us.posthog.com").replace(/\/+$/, "");
const check = process.argv.includes("--check");
if (!key || !project) {
  console.error("Set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID (see the top of this file).");
  process.exit(1);
}

const excluded = (process.env.EXCLUDE_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);
for (const id of excluded) {
  if (!/^[\w-]+$/.test(id)) throw new Error(`Not a distinct id: ${id}`);
}
// Added to every query's WHERE. Test accounts' own events are dropped; friends' events on their
// shares can't be tied back to them and stay in.
const ours = excluded.length ? `distinct_id NOT IN (${excluded.map((id) => `'${id}'`).join(", ")})` : "1 = 1";
// Booleans arrive as JSON true/false; toString makes 'true' / 'false' either way.
const yes = (prop) => `toString(properties.${prop}) = 'true'`;
const people = `multiIf(toString(properties.has_people) = 'true', 'With people', toString(properties.has_people) = 'false', 'Pure sunset', 'Not checked yet')`;

const insights = [
  {
    name: "1. Second sunset within 7 days of signing up",
    description: "New users whose first 7 days are over: how many saved 2 or more sunsets in those 7 days.",
    sql: `
      WITH signups AS (
        SELECT distinct_id, min(timestamp) AS joined FROM events
        WHERE event = 'signed_up' AND ${ours} GROUP BY distinct_id
      ),
      saves AS (
        SELECT s.distinct_id AS distinct_id, count() AS n FROM events AS e
        INNER JOIN signups AS s ON e.distinct_id = s.distinct_id
        WHERE e.event = 'entry_saved' AND e.timestamp <= s.joined + INTERVAL 7 DAY
        GROUP BY s.distinct_id
      )
      SELECT count() AS new_users, countIf(coalesce(saves.n, 0) >= 2) AS saved_a_second,
        round(100 * saved_a_second / nullIf(new_users, 0), 1) AS percent
      FROM signups LEFT JOIN saves ON signups.distinct_id = saves.distinct_id
      WHERE signups.joined < now() - INTERVAL 7 DAY`,
  },
  {
    name: "2. Sunsets with a story",
    description: "Of sunsets saved, how many got a story (typed or spoken).",
    sql: `
      SELECT countIf(event = 'entry_saved') AS sunsets_saved,
        count(DISTINCT if(event = 'story_saved', toString(properties.entry_id), NULL)) AS with_a_story,
        round(100 * with_a_story / nullIf(sunsets_saved, 0), 1) AS percent
      FROM events WHERE event IN ('entry_saved', 'story_saved') AND ${ours}`,
  },
  {
    name: "3. Sunsets shared, and shares with a reaction",
    description: "Of sunsets saved, how many were shared; of those, how many got at least one reaction.",
    sql: `
      SELECT countIf(event = 'entry_saved') AS sunsets_saved,
        count(DISTINCT if(event = 'entry_shared', toString(properties.entry_id), NULL)) AS shared,
        round(100 * shared / nullIf(sunsets_saved, 0), 1) AS percent_shared,
        count(DISTINCT if(event = 'reaction_received', toString(properties.entry_id), NULL)) AS got_a_reaction,
        round(100 * got_a_reaction / nullIf(shared, 0), 1) AS percent_of_shared_with_a_reaction
      FROM events WHERE event IN ('entry_saved', 'entry_shared', 'reaction_received') AND ${ours}`,
  },
  {
    name: "4. The main test: with people vs. pure sunsets",
    description:
      "PRD section 3. Per kind of photo: sunsets with a story, how many of those were shared, and how many shared ones got a reaction. 'Not checked yet' means the scorer hadn't looked at the photo.",
    sql: `
      SELECT ${people} AS photo,
        count(DISTINCT if(event = 'story_saved', toString(properties.entry_id), NULL)) AS with_a_story,
        count(DISTINCT if(event = 'entry_shared', toString(properties.entry_id), NULL)) AS shared,
        round(100 * shared / nullIf(with_a_story, 0), 1) AS percent_shared,
        count(DISTINCT if(event = 'reaction_received', toString(properties.entry_id), NULL)) AS got_a_reaction,
        round(100 * got_a_reaction / nullIf(shared, 0), 1) AS percent_with_a_reaction,
        countIf(event = 'reaction_received') AS reactions
      FROM events WHERE event IN ('story_saved', 'entry_shared', 'reaction_received') AND ${ours}
      GROUP BY photo ORDER BY photo`,
  },
  {
    name: "5. Share page → Start your own Journal",
    description:
      "Share page views and taps on Start your own Journal, for personal links (the person in the photo) vs. other friends; and sign-ups that came from a share.",
    sql: `
      SELECT if(${yes("personal")}, 'Personal link', 'Other friends') AS link,
        countIf(event IN ('share_page_viewed', 'set_page_viewed')) AS page_views,
        countIf(event = 'share_signup_tapped') AS start_your_own_journal,
        round(100 * start_your_own_journal / nullIf(page_views, 0), 1) AS percent
      FROM events WHERE event IN ('share_page_viewed', 'set_page_viewed', 'share_signup_tapped') AND ${ours}
      GROUP BY link
      UNION ALL
      SELECT 'Signed up from a share', NULL, countIf(${yes("from_share")}), NULL
      FROM events WHERE event = 'signed_up' AND ${ours}`,
  },
  {
    name: "6. Sunsets per active user, by week",
    description: "Sunsets saved per person who saved at least one that week.",
    sql: `
      SELECT toStartOfWeek(timestamp, 1) AS week, count() AS sunsets, count(DISTINCT distinct_id) AS people_saving,
        round(sunsets / people_saving, 2) AS per_person
      FROM events WHERE event = 'entry_saved' AND ${ours}
      GROUP BY week ORDER BY week DESC`,
  },
  {
    name: "7. Shares that include the voice",
    description: "Of shares whose story was spoken, how many had Include my voice on.",
    sql: `
      SELECT countIf(${yes("has_voice")}) AS shares_with_a_spoken_story,
        countIf(${yes("has_voice")} AND ${yes("include_voice")}) AS included_the_voice,
        round(100 * included_the_voice / nullIf(shares_with_a_spoken_story, 0), 1) AS percent
      FROM events WHERE event = 'entry_shared' AND ${ours}`,
  },
  {
    name: "8. Names added, and the With people filter",
    description: "Of photos with people that got a story, how many got names; and how many people used the With people filter.",
    sql: `
      SELECT count(DISTINCT if(event = 'story_saved' AND ${yes("has_people")}, toString(properties.entry_id), NULL)) AS photos_with_people,
        count(DISTINCT if(event = 'names_added', toString(properties.entry_id), NULL)) AS got_names,
        round(100 * got_names / nullIf(photos_with_people, 0), 1) AS percent,
        count(DISTINCT if(event = 'journal_filtered' AND toString(properties.show) = 'people', distinct_id, NULL)) AS people_using_the_filter
      FROM events WHERE event IN ('story_saved', 'names_added', 'journal_filtered') AND ${ours}`,
  },
  {
    name: "9. Friends adding to the story, and shared sets",
    description: "4f-4 and 4f-5: additions to the story (spoken or typed), sets shared, and replies to sets.",
    sql: `
      SELECT countIf(event = 'story_added') AS added_to_the_story,
        countIf(event = 'story_added' AND ${yes("spoken")}) AS of_which_spoken,
        countIf(event = 'set_shared') AS sets_shared,
        countIf(event = 'set_page_viewed') AS set_page_views,
        countIf(event IN ('set_reaction_received', 'set_note_received')) AS set_replies
      FROM events WHERE event IN ('story_added', 'set_shared', 'set_page_viewed', 'set_reaction_received', 'set_note_received') AND ${ours}`,
  },
  {
    name: "10. Activity by week",
    description: "How often each event happened, week by week.",
    sql: `
      SELECT toStartOfWeek(timestamp, 1) AS week, event, count() AS times
      FROM events WHERE event NOT LIKE '$%' AND ${ours}
      GROUP BY week, event ORDER BY week DESC, times DESC`,
  },
];

async function api(method, path, body) {
  const response = await fetch(`${host}/api/projects/${project}${path}`, {
    method,
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
}

const hogql = (sql) => ({ kind: "HogQLQuery", query: sql.replace(/\s+/g, " ").trim() });

// Run every query first, so a mistake stops the script before anything is saved.
let failed = false;
for (const insight of insights) {
  try {
    const result = await api("POST", "/query/", { query: hogql(insight.sql) });
    console.log(`\n${insight.name}`);
    console.table((result.results ?? []).slice(0, 12).map((row) => Object.fromEntries(result.columns.map((c, i) => [c, row[i]]))));
  } catch (error) {
    failed = true;
    console.error(`\n${insight.name}: FAILED\n${error.message}`);
  }
}
if (failed) {
  console.error("\nNothing was saved. Send the error above to whoever maintains this script.");
  process.exit(1);
}
if (check) {
  console.log("\n--check: nothing saved.");
  process.exit(0);
}

const dashboardName = "Sunset Soul — PRD metrics";
const dashboards = await api("GET", `/dashboards/?limit=200`);
let dashboard = dashboards.results.find((d) => d.name === dashboardName && !d.deleted);
if (!dashboard) {
  dashboard = await api("POST", "/dashboards/", {
    name: dashboardName,
    description: "The PRD's success metrics (docs/analytics.md). Made by scripts/posthog-dashboard.mjs; run it again to update.",
  });
}

const existing = await api("GET", `/insights/?limit=200&saved=true`);
for (const insight of insights) {
  const body = {
    name: insight.name,
    description: insight.description,
    query: { kind: "DataVisualizationNode", source: hogql(insight.sql) },
    dashboards: [dashboard.id],
    saved: true,
  };
  const found = existing.results.find((i) => i.name === insight.name && !i.deleted);
  if (found) {
    const dashboardsNow = new Set([...(found.dashboards ?? []), dashboard.id]);
    await api("PATCH", `/insights/${found.id}/`, { ...body, dashboards: [...dashboardsNow] });
    console.log(`Updated: ${insight.name}`);
  } else {
    await api("POST", "/insights/", body);
    console.log(`Created: ${insight.name}`);
  }
}
console.log(`\nDone: ${host}/project/${project}/dashboard/${dashboard.id}`);
