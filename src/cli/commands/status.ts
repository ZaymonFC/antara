/**
 * Status command - Display progress for all activities
 */

import { colors } from "@cliffy/ansi/colors";
import type { Database } from "../../db/connection.ts";
import { listActivities } from "../../lib/activities.ts";
import { getActivityHistory } from "../../lib/history.ts";
import { getProgress, type ProgressStatus } from "../../lib/progress.ts";
import { getRhythm } from "../../lib/rhythms.ts";
import type { Rhythm } from "../../types.ts";

interface ActivityWithProgress {
  name: string;
  progress: ProgressStatus;
  rhythm: Rhythm;
  measurement: "instances" | "duration";
}

export async function statusCommand(db: Database): Promise<void> {
  const activities = await listActivities(db);

  if (activities.length === 0) {
    console.log("No activities yet. Run `antara create` to create one.");
    return;
  }

  const now = new Date();
  const items: ActivityWithProgress[] = [];

  for (const activity of activities) {
    const rhythm = await getRhythm(db, activity.rhythmId);
    if (!rhythm) continue;

    const history = await getActivityHistory(db, activity.id);
    const progress = getProgress(activity, rhythm, history, now);

    items.push({
      name: activity.name,
      progress,
      rhythm,
      measurement: activity.measurement as "instances" | "duration",
    });
  }

  renderHeader(items, now);

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
    renderSection(overdue, colors.yellow);
  }

  if (dueSoon.length > 0) {
    console.log(colors.cyan(`In Progress (${dueSoon.length})`));
    renderSection(dueSoon, colors.cyan);
  }

  if (complete.length > 0) {
    console.log(colors.green(`Complete (${complete.length})`));
    renderSection(complete, colors.green);
  }

  console.log();
}

function renderHeader(items: ActivityWithProgress[], now: Date): void {
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

function renderSection(items: ActivityWithProgress[], colorFn: (str: string) => string): void {
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
