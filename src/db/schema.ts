/**
 * Database schema definitions using Drizzle ORM
 *
 * Domain model:
 * - Rhythms: Define when activities should occur (trailing, recurring, or calendar-based)
 * - Activities: Tasks or pursuits with associated rhythms and targets
 * - History: Event store for completions and duration logs
 */

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Rhythms table - stores rhythm configurations
 *
 * Uses a discriminated union pattern with nullable fields for variant-specific data:
 * - trailing: count + unit (e.g., "within 3 days of last completion")
 * - recurring: every + unit (e.g., "every 2 weeks")
 * - calendar: period (e.g., "daily", "weekly")
 */
export const rhythms = sqliteTable("rhythms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind", { enum: ["trailing", "recurring", "calendar"] }).notNull(),

  // Trailing rhythm fields (nullable when not trailing)
  trailingCount: integer("trailing_count"),
  trailingUnit: text("trailing_unit", { enum: ["days", "weeks", "months"] }),

  // Recurring rhythm fields (nullable when not recurring)
  recurringEvery: integer("recurring_every"),
  recurringUnit: text("recurring_unit", { enum: ["days", "weeks", "months"] }),

  // Calendar rhythm fields (nullable when not calendar)
  calendarPeriod: text("calendar_period", {
    enum: ["daily", "weekly", "monthly", "yearly"],
  }),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/**
 * Activities table - unified activity with framing
 *
 * Framing determines how the activity is presented:
 * - task: Something to be done (checkbox-style)
 * - pursuit: Something to work towards (progress-style)
 *
 * All activities have a rhythm, target, and measurement type.
 */
export const activities = sqliteTable("activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  framing: text("framing", { enum: ["task", "pursuit"] }).notNull(),
  rhythmId: integer("rhythm_id")
    .notNull()
    .references(() => rhythms.id),
  target: integer("target").notNull(), // Always required, minimum 1
  measurement: text("measurement", { enum: ["instances", "duration"] }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/**
 * History table - event store for completions and duration logs
 *
 * Records all activity events:
 * - completion: A single instance of completing the activity
 * - duration: Time spent on the activity (minutes field populated)
 */
export const history = sqliteTable("history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  activityId: integer("activity_id")
    .notNull()
    .references(() => activities.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["completion", "duration"] }).notNull(),
  minutes: integer("minutes"), // Only for duration events
  timestamp: integer("timestamp", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Inferred types for Rhythm
export type Rhythm = InferSelectModel<typeof rhythms>;
export type NewRhythm = InferInsertModel<typeof rhythms>;

// Inferred types for Activity
export type Activity = InferSelectModel<typeof activities>;
export type NewActivity = InferInsertModel<typeof activities>;

// Inferred types for History
export type HistoryEvent = InferSelectModel<typeof history>;
export type NewHistoryEvent = InferInsertModel<typeof history>;

/**
 * Errands table - one-off tasks with no rhythm
 *
 * Errands are due immediately upon creation. Once completed, they remain
 * visible for 3 days before being hidden from the default list view.
 */
export const errands = sqliteTable("errands", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

// Inferred types for Errand
export type Errand = InferSelectModel<typeof errands>;
export type NewErrand = InferInsertModel<typeof errands>;
