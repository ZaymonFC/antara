/**
 * Individual prompt functions for activity forms.
 * Each function takes an optional default and returns the user's selection.
 */

import { Input, Select } from "@cliffy/prompt";
import type { CalendarPeriod, Framing, Measurement, RhythmKind, TimeUnit } from "../../types.ts";

// Option data - single source of truth for wording

const FRAMING_OPTIONS = [
  { name: "pursuit - something to grow (e.g., climbing, reading)", value: "pursuit" },
  { name: "task - something to maintain (e.g., clean bathroom)", value: "task" },
] as const;

const MEASUREMENT_OPTIONS = [
  { name: "by counting times (e.g., 3 sessions)", value: "instances" },
  { name: "by tracking minutes (e.g., 150 min)", value: "duration" },
] as const;

const RHYTHM_TYPE_OPTIONS = [
  { name: "per week/month (calendar periods)", value: "calendar" },
  { name: "rolling window (last N days/weeks)", value: "trailing" },
  { name: "recurring (resets when done)", value: "recurring" },
] as const;

const CALENDAR_PERIOD_OPTIONS = [
  { name: "per day", value: "daily" },
  { name: "per week", value: "weekly" },
  { name: "per month", value: "monthly" },
  { name: "per year", value: "yearly" },
] as const;

const TIME_UNIT_OPTIONS = [
  { name: "days", value: "days" },
  { name: "weeks", value: "weeks" },
  { name: "months", value: "months" },
] as const;

// Prompt functions

export async function promptName(defaultValue?: string): Promise<string> {
  return Input.prompt({
    message: "What do you want to track?",
    default: defaultValue,
  });
}

export async function promptFraming(defaultValue?: Framing): Promise<Framing> {
  return (await Select.prompt({
    message: "Is this a",
    default: defaultValue,
    options: [...FRAMING_OPTIONS],
  })) as Framing;
}

export async function promptMeasurement(defaultValue?: Measurement): Promise<Measurement> {
  return (await Select.prompt({
    message: "How do you measure progress?",
    default: defaultValue,
    options: [...MEASUREMENT_OPTIONS],
  })) as Measurement;
}

export async function promptRhythmType(defaultValue?: RhythmKind): Promise<RhythmKind> {
  return (await Select.prompt({
    message: "How often?",
    default: defaultValue,
    options: [...RHYTHM_TYPE_OPTIONS],
  })) as RhythmKind;
}

export async function promptCalendarPeriod(defaultValue?: CalendarPeriod): Promise<CalendarPeriod> {
  return (await Select.prompt({
    message: "Which period?",
    default: defaultValue ?? "weekly",
    options: [...CALENDAR_PERIOD_OPTIONS],
  })) as CalendarPeriod;
}

export async function promptTimeUnit(message: string, defaultValue?: TimeUnit): Promise<TimeUnit> {
  return (await Select.prompt({
    message,
    default: defaultValue ?? "days",
    options: [...TIME_UNIT_OPTIONS],
  })) as TimeUnit;
}

export async function promptNumber(message: string, defaultValue?: number): Promise<number> {
  const str = await Input.prompt({
    message,
    default: defaultValue?.toString(),
  });
  return parseInt(str, 10);
}

export async function promptTarget(
  measurement: Measurement,
  defaultValue?: number,
): Promise<number> {
  const message = measurement === "duration" ? "How many minutes?" : "How many times?";
  return promptNumber(message, defaultValue);
}
