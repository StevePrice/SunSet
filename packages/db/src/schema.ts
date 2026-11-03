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
    // When the photo was taken (from the photo's metadata), or when it was saved.
    takenAt: timestamp("taken_at", { withTimezone: true }).notNull().defaultNow(),
    // Exact point, never shown publicly; the Live Map (Phase 5) uses a rounded copy.
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
