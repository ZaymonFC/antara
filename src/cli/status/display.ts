/**
 * Display functions for activity status.
 */

import { colors } from "@cliffy/ansi/colors";
import type { Rhythm } from "../../types.ts";
import type { ActivityWithProgress } from "./types.ts";

/**
 * Display the full status with header and grouped sections.
 */
export function displayFullStatus(items: ActivityWithProgress[]): void {
  const now = new Date();
  displayHeader(items, now);

  // Group activities into three categories
  const overdue = items.filter((i) => i.progress.daysOverdue !== undefined);
  const dueSoon = items.filter(
    (i) => i.progress.daysOverdue === undefined && !i.progress.isOnTrack,
  );
  const complete = items.filter(
    (i) => i.progress.daysOverdue === undefined && i.progress.isOnTrack,
  );

  if (overdue.length > 0) {
    console.log(colors.yellow(`Overdue (${overdue.length})`));
    displaySection(overdue, colors.yellow);
  }

  if (dueSoon.length > 0) {
    console.log(colors.cyan(`In Progress (${dueSoon.length})`));
    displaySection(dueSoon, colors.cyan);
  }

  if (complete.length > 0) {
    console.log(colors.green(`Complete (${complete.length})`));
    displaySection(complete, colors.green);
  }

  console.log();
}

/**
 * Display a single activity's status (for post-log).
 */
export function displaySingleActivity(item: ActivityWithProgress): void {
  const progressStr = formatProgress(item);
  const contextStr = formatContext(item);

  // Determine color based on status
  let colorFn = colors.cyan;
  if (item.progress.daysOverdue !== undefined) {
    colorFn = colors.yellow;
  } else if (item.progress.isOnTrack) {
    colorFn = colors.green;
  }

  console.log(`\n${colorFn(item.name)}  ${progressStr}  ${colors.dim(contextStr)}`);
}

function displayHeader(items: ActivityWithProgress[], now: Date): void {
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const activityWord = items.length === 1 ? "activity" : "activities";
  console.log();
  console.log(
    colors.dim(dateStr) + colors.dim(" · ") + colors.dim(`${items.length} ${activityWord}`),
  );
  console.log();
}

function displaySection(items: ActivityWithProgress[], colorFn: (str: string) => string): void {
  const maxNameLength = Math.max(...items.map((i) => i.name.length));

  for (const item of items) {
    const name = item.name.padEnd(maxNameLength + 2);
    const progressStr = formatProgress(item);
    const contextStr = formatContext(item);

    console.log(`  ${colorFn(name)}${progressStr}  ${colors.dim(contextStr)}`);
  }
  console.log();
}

function formatProgress(item: ActivityWithProgress): string {
  const { progress, measurement, rhythm } = item;

  // For recurring rhythms that are complete, show checkmark
  if (rhythm.kind === "recurring" && progress.isOnTrack) {
    const lastDone = progress.context === "today" ? "Done today" : `Done ${progress.context}`;
    return colors.green(`✓ ${lastDone}`);
  }

  // For recurring rhythms that are overdue or not started
  if (rhythm.kind === "recurring") {
    return progress.context === "Not started yet"
      ? colors.dim("Not started yet")
      : colors.yellow(progress.context);
  }

  // For trailing/calendar rhythms, show progress bar
  const bar = progressBar(progress.current, progress.target);

  if (measurement === "duration") {
    const label = `${progress.current}/${progress.target} min`;
    if (progress.isOnTrack) {
      return colors.green(`${bar}  ${label}`);
    }
    return `${bar}  ${label}`;
  }

  // Instance-based
  const label = `${progress.current}/${progress.target}`;
  if (progress.isOnTrack) {
    return colors.green(`${bar}  ${label} ✓`);
  }
  return `${bar}  ${label}`;
}

function formatContext(item: ActivityWithProgress): string {
  const { progress, rhythm } = item;

  // For recurring rhythms
  if (rhythm.kind === "recurring") {
    if (progress.isOnTrack && progress.daysUntilDue !== undefined) {
      if (progress.daysUntilDue === 0) {
        return "due today";
      }
      if (progress.daysUntilDue === 1) {
        return "due tomorrow";
      }
      return `due in ${progress.daysUntilDue} days`;
    }
    return formatRhythm(rhythm);
  }

  // For calendar rhythms
  if (rhythm.kind === "calendar" && progress.daysRemaining !== undefined) {
    if (progress.isOnTrack) {
      return progress.periodLabel ?? "";
    }
    if (progress.daysRemaining === 0) {
      return "due today";
    }
    if (progress.daysRemaining === 1) {
      return "1 day left";
    }
    return `${progress.daysRemaining} days left`;
  }

  // For trailing rhythms - show the window
  if (rhythm.kind === "trailing") {
    return progress.periodLabel ?? formatRhythm(rhythm);
  }

  return formatRhythm(rhythm);
}

function progressBar(current: number, target: number, width = 10): string {
  const ratio = Math.min(current / target, 1);
  const filled = Math.round(ratio * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function formatRhythm(rhythm: Rhythm): string {
  switch (rhythm.kind) {
    case "trailing":
      return `last ${rhythm.count} ${rhythm.unit}`;
    case "recurring":
      return `every ${rhythm.every} ${rhythm.unit}`;
    case "calendar":
      return `per ${rhythm.period.replace("ly", "")}`;
  }
}
