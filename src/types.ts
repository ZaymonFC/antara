/**
 * Domain Types for Antara
 *
 * This file defines the core domain model for Antara's activity tracking system.
 * The domain model supports three rhythm types (trailing, recurring, calendar),
 * two activity framings (task, pursuit), and two measurement modes (instances, duration).
 */

// ============================================================================
// Rhythm System
// ============================================================================

/**
 * The kind of rhythm that governs when an activity should be performed.
 * - trailing: Look back N time units from now (rolling window)
 * - recurring: Every N time units from a start date
 * - calendar: Aligned to calendar boundaries (daily, weekly, etc.)
 */
export const RhythmKind = {
  trailing: "trailing",
  recurring: "recurring",
  calendar: "calendar",
} as const;

export type RhythmKind = (typeof RhythmKind)[keyof typeof RhythmKind];

/**
 * Time units used for Trailing and Recurring rhythms.
 * Defines the granularity of the time window.
 */
export const TimeUnit = {
  days: "days",
  weeks: "weeks",
  months: "months",
} as const;

export type TimeUnit = (typeof TimeUnit)[keyof typeof TimeUnit];

/**
 * Calendar periods for CalendarRhythm.
 * Aligns activity tracking to natural calendar boundaries.
 */
export const CalendarPeriod = {
  daily: "daily",
  weekly: "weekly",
  monthly: "monthly",
  yearly: "yearly",
} as const;

export type CalendarPeriod = (typeof CalendarPeriod)[keyof typeof CalendarPeriod];

// ============================================================================
// Rhythm Discriminated Union
// ============================================================================

/**
 * Trailing rhythm: look back `count` time units from the current moment.
 * Example: "3 times in the last 7 days" uses count=7, unit="days"
 */
export interface TrailingRhythm {
  kind: "trailing";
  count: number;
  unit: TimeUnit;
}

/**
 * Recurring rhythm: repeats every `every` time units from a reference point.
 * Example: "every 2 weeks" uses every=2, unit="weeks"
 */
export interface RecurringRhythm {
  kind: "recurring";
  every: number;
  unit: TimeUnit;
}

/**
 * Calendar rhythm: aligned to calendar period boundaries.
 * Example: "weekly" resets every Monday, "monthly" resets on the 1st.
 */
export interface CalendarRhythm {
  kind: "calendar";
  period: CalendarPeriod;
}

/**
 * Discriminated union of all rhythm types.
 * Use the `kind` field to narrow the type.
 */
export type Rhythm = TrailingRhythm | RecurringRhythm | CalendarRhythm;

// ============================================================================
// Activity Configuration
// ============================================================================

/**
 * Activity framing determines the UX mindset for the activity.
 * - task: One-off or completable items (checkbox mentality)
 * - pursuit: Ongoing practice or habit (streak/progress mentality)
 */
export const Framing = {
  task: "task",
  pursuit: "pursuit",
} as const;

export type Framing = (typeof Framing)[keyof typeof Framing];

/**
 * How progress toward a goal is measured.
 * - instances: Count the number of completions
 * - duration: Track cumulative time spent (in minutes)
 */
export const Measurement = {
  instances: "instances",
  duration: "duration",
} as const;

export type Measurement = (typeof Measurement)[keyof typeof Measurement];

// ============================================================================
// History Events
// ============================================================================

/**
 * The kind of history event recorded for an activity.
 * - completion: A discrete completion event (for instance-based measurement)
 * - duration: A timed session (for duration-based measurement)
 */
export const HistoryEventKind = {
  completion: "completion",
  duration: "duration",
} as const;

export type HistoryEventKind = (typeof HistoryEventKind)[keyof typeof HistoryEventKind];
