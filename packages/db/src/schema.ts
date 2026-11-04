// Drizzle table definitions. `entries` is the Journal; Better Auth owns users, sessions, accounts, verifications and
// rate_limits (field names follow its core schema; table names are plural via `usePlural`).
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { point4326 } from "./point";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  // "admin" can see every Journal (logged in admin_views) and use the calibration tools.
  role: text("role").notNull().default("user"),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  ...timestamps,
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (table) => [index("accounts_user_id_idx").on(table.userId)],
);

// Email verification, password reset and magic-link tokens.
export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

// Shared across Worker isolates, unlike Better Auth's default in-memory limiter.
export const rateLimits = pgTable("rate_limits", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

// A saved sunset. Private to its owner; photos live in R2 under entries/{userId}/{id}/.
export const entries = pgTable(
  "entries",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    story: text("story"),
    // Suggested by AI Story Capture and editable; the caption is what share cards show.
    title: text("title"),
    caption: text("caption"),
    // When the photo was taken (from the photo's metadata), or when it was saved.
    takenAt: timestamp("taken_at", { withTimezone: true }).notNull().defaultNow(),
    // Exact point, never shown publicly; the Live Map (Phase 6) uses a rounded copy.
    location: point4326("location"),
    photoWidth: integer("photo_width").notNull(),
    photoHeight: integer("photo_height").notNull(),
    ...timestamps,
  },
  (table) => [index("entries_user_taken_at_idx").on(table.userId, table.takenAt.desc())],
);

// An entry's score, one row per scorer version so re-scoring keeps history. Written by the
// scoring Worker; `details` holds the pixel metrics and what the vision model saw.
export const entryScores = pgTable(
  "entry_scores",
  {
    entryId: text("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    scorerVersion: text("scorer_version").notNull(),
    // pending | done | not_sunset | failed
    status: text("status").notNull().default("pending"),
    palette: smallint("palette"),
    reach: smallint("reach"),
    setting: smallint("setting"),
    wow: smallint("wow"),
    composite: numeric("composite", { precision: 4, scale: 2, mode: "number" }),
    displayScore: smallint("display_score"),
    details: jsonb("details").$type<Record<string, unknown>>(),
    attempts: integer("attempts").notNull().default(0),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    scoredAt: timestamp("scored_at", { withTimezone: true }),
  },
  (table) => [primaryKey({ columns: [table.entryId, table.scorerVersion] })],
);

// A public share link for an entry, at /s/{id}. At most one per entry; "Stop sharing" deletes
// the row, so the old link stops working for good. The id is random and unguessable.
export const shares = pgTable(
  "shares",
  {
    id: text("id").primaryKey(),
    entryId: text("entry_id")
      .notNull()
      .unique()
      .references(() => entries.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Optional place name the owner typed for this share; the entry's exact location is never shared.
    place: text("place"),
    // The owner's time zone when they shared, so the date shown is the day they saw the sunset.
    timeZone: text("time_zone").notNull(),
    ...timestamps,
  },
  (table) => [index("shares_user_idx").on(table.userId)],
);

// One AI Story Capture interview per entry (Phase 5). `turns` holds each question and answer in
// order; `drafts` holds each written version, keyed by style, with the number of turns it was
// written from so stale drafts can be spotted.
export type StoryTurn = { question: string | null; answer: string; via: "typed" | "spoken" };
export type StoryDraft = { text: string; turns: number; edited: boolean };

export const storySessions = pgTable("story_sessions", {
  entryId: text("entry_id")
    .primaryKey()
    .references(() => entries.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  openers: jsonb("openers").$type<string[]>().notNull().default([]),
  // Every question shown so far, so "Ask me something else" never repeats one.
  asked: jsonb("asked").$type<string[]>().notNull().default([]),
  turns: jsonb("turns").$type<StoryTurn[]>().notNull().default([]),
  nextQuestion: text("next_question"),
  // The interviewer's read of the last answer: wrap up, go gently, or show support resources.
  wrapUp: boolean("wrap_up").notNull().default(false),
  sensitive: boolean("sensitive").notNull().default(false),
  safetyConcern: boolean("safety_concern").notNull().default(false),
  drafts: jsonb("drafts").$type<Record<string, StoryDraft>>().notNull().default({}),
  title: text("title"),
  caption: text("caption"),
  ...timestamps,
});

// One row per AI call, for the per-user daily limit.
export const aiCalls = pgTable(
  "ai_calls",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ai_calls_user_created_idx").on(table.userId, table.createdAt)],
);

// Every time an admin opens someone else's Journal or entry.
export const adminViews = pgTable(
  "admin_views",
  {
    id: text("id").primaryKey(),
    adminId: text("admin_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    viewedUserId: text("viewed_user_id").notNull(),
    entryId: text("entry_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("admin_views_viewed_idx").on(table.viewedUserId, table.createdAt)],
);

// The reference photo set the founders rate to calibrate the scorer (concept doc, "Keeping Scores
// Consistent"). Photos live in R2 at calibration/{id}.jpg; `model` holds the current scorer's result.
export type CalibrationModelScore = {
  scorerVersion: string;
  isSunset: boolean;
  palette?: number;
  reach?: number;
  setting?: number;
  wow?: number;
  wowReason?: string;
};

export const calibrationPhotos = pgTable("calibration_photos", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  credit: text("credit"),
  sourceUrl: text("source_url"),
  isSunset: boolean("is_sunset").notNull().default(true),
  model: jsonb("model").$type<CalibrationModelScore>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One side-by-side judgement: which of two photos has more of a parameter.
export const calibrationVotes = pgTable(
  "calibration_votes",
  {
    id: text("id").primaryKey(),
    raterId: text("rater_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    param: text("param").notNull(),
    leftId: text("left_id")
      .notNull()
      .references(() => calibrationPhotos.id, { onDelete: "cascade" }),
    rightId: text("right_id")
      .notNull()
      .references(() => calibrationPhotos.id, { onDelete: "cascade" }),
    // left | right | same
    choice: text("choice").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("calibration_votes_param_idx").on(table.param, table.raterId)],
);
