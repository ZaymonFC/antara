/**
 * Progress calculation for activities
 *
 * Computes current progress and on-track status based on rhythm type:
 * - Recurring: on track if days since last <= every value
 * - Trailing: on track if count >= target in rolling window
 * - Calendar: on track if count >= target in current period
 */

import { differenceInCalendarDays } from "date-fns";
import type { Activity, HistoryEvent } from "../db/schema.ts";
import type { Rhythm } from "../types.ts";

export interface ProgressStatus {
  /** Current progress value (count for instances, minutes for duration) */
  current: number;
  /** Target value */
  target: number;
  /** Whether the activity is on track */
  isOnTrack: boolean;
  /** Human-readable context (e.g., "3 days ago", "2 days overdue") */
  context: string;
  /** Days remaining in current period (trailing/calendar rhythms) */
  daysRemaining?: number;
  /** Days until next due (recurring rhythm, when on track) */
  daysUntilDue?: number;
  /** Days past due (recurring rhythm, when overdue) */
  daysOverdue?: number;
  /** Period label for display (e.g., "this week", "last 7 days") */
  periodLabel?: string;
}

/**
 * Calculate progress for an activity given its rhythm and history
 */
export function getProgress(
  activity: Activity,
  rhythm: Rhythm,
  history: HistoryEvent[],
  now: Date = new Date(),
): ProgressStatus {
  switch (rhythm.kind) {
    case "recurring":
      return getRecurringProgress(activity, rhythm, history, now);
    case "trailing":
      return getTrailingProgress(activity, rhythm, history, now);
    case "calendar":
      return getCalendarProgress(activity, rhythm, history, now);
  }
}

/**
 * Recurring rhythm: "every N days/weeks/months"
 * On track if time since last completion <= rhythm interval
 */
function getRecurringProgress(
  activity: Activity,
  rhythm: { kind: "recurring"; every: number; unit: "days" | "weeks" | "months" },
  history: HistoryEvent[],
  now: Date,
): ProgressStatus {
  const lastEvent = findLastEvent(history);
  const intervalDays = unitToDays(rhythm.every, rhythm.unit);

  if (!lastEvent) {
    return {
      current: 0,
      target: activity.target,
      isOnTrack: false,
      context: "Not started yet",
      daysOverdue: 0,
    };
  }

  // Use calendar days for human-friendly display
  const daysSinceLast = differenceInCalendarDays(now, lastEvent.timestamp);
  const isOnTrack = daysSinceLast <= intervalDays;

  if (isOnTrack) {
    const daysUntilDue = intervalDays - daysSinceLast;
    return {
      current: activity.target,
      target: activity.target,
      isOnTrack: true,
      context:
        daysSinceLast === 0 ? "today" : `${daysSinceLast} day${daysSinceLast === 1 ? "" : "s"} ago`,
      daysUntilDue,
    };
  }

  const daysOverdue = daysSinceLast - intervalDays;
  return {
    current: 0,
    target: activity.target,
    isOnTrack: false,
    context: `${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue`,
    daysOverdue,
  };
}

/**
 * Trailing rhythm: "N times in the last X days/weeks/months"
 * On track if count in window >= target
 */
function getTrailingProgress(
  activity: Activity,
  rhythm: { kind: "trailing"; count: number; unit: "days" | "weeks" | "months" },
  history: HistoryEvent[],
  now: Date,
): ProgressStatus {
  const windowMs = unitToMs(rhythm.count, rhythm.unit);
  const windowStart = new Date(now.getTime() - windowMs);

  const eventsInWindow = history.filter((e) => e.timestamp >= windowStart);
  const current = aggregateProgress(eventsInWindow, activity.measurement);
  const periodLabel = `last ${rhythm.count} ${rhythm.unit}`;

  return {
    current,
    target: activity.target,
    isOnTrack: current >= activity.target,
    context: periodLabel,
    periodLabel,
  };
}

/**
 * Calendar rhythm: "N times per day/week/month/year"
 * On track if count in current period >= target
 */
function getCalendarProgress(
  activity: Activity,
  rhythm: { kind: "calendar"; period: "daily" | "weekly" | "monthly" | "yearly" },
  history: HistoryEvent[],
  now: Date,
): ProgressStatus {
  const periodStart = getPeriodStart(now, rhythm.period);
  const periodEnd = getPeriodEnd(now, rhythm.period);
  const eventsInPeriod = history.filter((e) => e.timestamp >= periodStart);
  const current = aggregateProgress(eventsInPeriod, activity.measurement);

  const periodName = rhythm.period === "daily" ? "day" : rhythm.period.replace("ly", "");
  const periodLabel = `this ${periodName}`;

  // Calculate days remaining in period
  const msRemaining = periodEnd.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  return {
    current,
    target: activity.target,
    isOnTrack: current >= activity.target,
    context: periodLabel,
    daysRemaining,
    periodLabel,
  };
}

// =============================================================================
// Helpers
// =============================================================================

function findLastEvent(history: HistoryEvent[]): HistoryEvent | undefined {
  if (history.length === 0) return undefined;
  return history.reduce((latest, event) => (event.timestamp > latest.timestamp ? event : latest));
}

function unitToMs(count: number, unit: "days" | "weeks" | "months"): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  switch (unit) {
    case "days":
      return count * msPerDay;
    case "weeks":
      return count * 7 * msPerDay;
    case "months":
      return count * 30 * msPerDay; // Approximation
  }
}

function unitToDays(count: number, unit: "days" | "weeks" | "months"): number {
  switch (unit) {
    case "days":
      return count;
    case "weeks":
      return count * 7;
    case "months":
      return count * 30; // Approximation
  }
}

function aggregateProgress(events: HistoryEvent[], measurement: "instances" | "duration"): number {
  if (measurement === "instances") {
    return events.length;
  }
  return events.reduce((sum, e) => sum + (e.minutes ?? 0), 0);
}

function getPeriodStart(now: Date, period: "daily" | "weekly" | "monthly" | "yearly"): Date {
  const start = new Date(now);

  switch (period) {
    case "daily":
      start.setHours(0, 0, 0, 0);
      break;
    case "weekly": {
      const day = start.getDay();
      // Week starts on Monday (day 1), Sunday is 0
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case "monthly":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case "yearly":
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
  }

  return start;
}

function getPeriodEnd(now: Date, period: "daily" | "weekly" | "monthly" | "yearly"): Date {
  const end = new Date(now);

  switch (period) {
    case "daily":
      end.setHours(23, 59, 59, 999);
      break;
    case "weekly": {
      const day = end.getDay();
      // Week ends on Sunday
      const daysUntilSunday = day === 0 ? 0 : 7 - day;
      end.setDate(end.getDate() + daysUntilSunday);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case "monthly":
      end.setMonth(end.getMonth() + 1, 0); // Last day of current month
      end.setHours(23, 59, 59, 999);
      break;
    case "yearly":
      end.setMonth(11, 31); // Dec 31
      end.setHours(23, 59, 59, 999);
      break;
  }

  return end;
}
