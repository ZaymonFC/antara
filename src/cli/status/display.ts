/**
 * Display functions for activity status.
 */

import { colors } from "@cliffy/ansi/colors";
import type { Errand } from "../../db/schema.ts";
import type { Rhythm } from "../../types.ts";
import type { ActivityWithProgress } from "./types.ts";

/**
 * Display the full status with header and grouped sections.
 */
export function displayFullStatus(items: ActivityWithProgress[], errands: Errand[] = []): void {
  const now = new Date();
  displayHeader(items, errands, now);

  // Pending errands go at the top - they're due immediately
  const pendingErrands = errands.filter((e) => e.completedAt === null);
  if (pendingErrands.length > 0) {
    console.log(colors.yellow(`Errands (${pendingErrands.length})`));
    for (const errand of pendingErrands) {
      console.log(`  ${colors.yellow("•")} ${errand.name}`);
    }
    console.log();
  }

  // Group activities into three categories
  const needsAttention = items.filter(
    (i) => i.progress.daysOverdue !== undefined || i.progress.daysUntilDue === 0,
  );
  const inProgress = items.filter(
    (i) =>
      i.progress.daysOverdue === undefined &&
      i.progress.daysUntilDue !== 0 &&
      !i.progress.isOnTrack,
  );
  const complete = items.filter(
    (i) =>
      i.progress.daysOverdue === undefined && i.progress.daysUntilDue !== 0 && i.progress.isOnTrack,
  );

  if (needsAttention.length > 0) {
    console.log(colors.yellow(`Needs Attention (${needsAttention.length})`));
    // Display overdue (red) and due today (yellow) with different colors
    const maxNameLength = Math.max(...needsAttention.map((i) => i.name.length));
    for (const item of needsAttention) {
      const colorFn = item.progress.daysOverdue !== undefined ? colors.red : colors.yellow;
      displayItem(item, colorFn, maxNameLength);
    }
    console.log();
  }

  if (inProgress.length > 0) {
    console.log(colors.blue(`In Progress (${inProgress.length})`));
    displaySection(inProgress, colors.blue);
  }

  if (complete.length > 0) {
    console.log(colors.green(`Complete (${complete.length})`));
    displaySection(complete, colors.green);
  }

  // Recently completed errands at the bottom
  const completedErrands = errands.filter((e) => e.completedAt !== null);
  if (completedErrands.length > 0) {
    console.log(colors.dim(`Recently Done (${completedErrands.length})`));
    for (const errand of completedErrands) {
      const completedAt = errand.completedAt as Date;
      const completedStr = formatCompletedDate(completedAt, now);
      console.log(
        `  ${colors.dim("✓")} ${colors.strikethrough(colors.dim(errand.name))}  ${colors.dim(completedStr)}`,
      );
    }
    console.log();
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
  let colorFn = colors.blue; // in progress (default)
  if (item.progress.daysOverdue !== undefined) {
    colorFn = colors.red; // overdue
  } else if (item.progress.daysUntilDue === 0) {
    colorFn = colors.yellow; // due today
  } else if (item.progress.isOnTrack) {
    colorFn = colors.green; // complete
  }

  console.log(`\n${colorFn(item.name)}  ${progressStr}  ${colors.dim(contextStr)}`);
}

function displayHeader(items: ActivityWithProgress[], errands: Errand[], now: Date): void {
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const activityWord = items.length === 1 ? "activity" : "activities";
  const pendingErrands = errands.filter((e) => e.completedAt === null).length;

  const parts: string[] = [];
  if (items.length > 0) {
    parts.push(`${items.length} ${activityWord}`);
  }
  if (pendingErrands > 0) {
    const errandWord = pendingErrands === 1 ? "errand" : "errands";
    parts.push(`${pendingErrands} ${errandWord}`);
  }

  console.log();
  console.log(colors.bold("Antara (अन्तर) Status Report"));
  console.log(
    colors.dim(dateStr) +
      (parts.length > 0 ? colors.dim(" · ") + colors.dim(parts.join(", ")) : ""),
  );
  console.log();
}

function formatCompletedDate(date: Date, now: Date): string {
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays === 0) {
    return "today";
  }
  if (diffDays === 1) {
    return "yesterday";
  }
  return `${diffDays} days ago`;
}

function displaySection(items: ActivityWithProgress[], colorFn: (str: string) => string): void {
  const maxNameLength = Math.max(...items.map((i) => i.name.length));
  for (const item of items) {
    displayItem(item, colorFn, maxNameLength);
  }
  console.log();
}

function displayItem(
  item: ActivityWithProgress,
  colorFn: (str: string) => string,
  maxNameLength?: number,
): void {
  const progressStr = formatProgress(item);
  const contextStr = formatContext(item);
  const name = maxNameLength ? item.name.padEnd(maxNameLength + 2) : item.name;
  console.log(`  ${colorFn(name)}${progressStr}  ${colors.dim(contextStr)}`);
}

function formatProgress(item: ActivityWithProgress): string {
  const { progress, measurement, rhythm } = item;

  // For recurring rhythms
  if (rhythm.kind === "recurring") {
    // Due today - needs attention
    if (progress.daysUntilDue === 0) {
      return colors.yellow("Due today");
    }

    // On track, not due today
    if (progress.isOnTrack) {
      const lastDone = progress.context === "today" ? "Done today" : `Done ${progress.context}`;
      return colors.green(`✓ ${lastDone}`);
    }

    // Overdue or not started
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
    // If due today, show when it was last done (not "due today" again)
    if (progress.daysUntilDue === 0) {
      return `last done ${progress.context}`;
    }

    if (progress.isOnTrack && progress.daysUntilDue !== undefined) {
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
