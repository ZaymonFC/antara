/**
 * Errand commands - CRUD operations for one-off tasks
 *
 * Commands:
 * - errand (list)  - List pending and recently completed errands
 * - errand add     - Create a new errand
 * - errand done    - Mark an errand as complete
 */

import { colors } from "@cliffy/ansi/colors";
import { Input, Select } from "@cliffy/prompt";
import type { Database } from "../../db/connection.ts";
import {
  completeErrand,
  createErrand,
  listErrands,
  listPendingErrands,
} from "../../lib/errands.ts";

/**
 * List errands (default command for `antara errand`)
 */
export async function errandListCommand(db: Database): Promise<void> {
  const errands = await listErrands(db);

  if (errands.length === 0) {
    console.log(colors.dim("\nNo errands. Nice!"));
    return;
  }

  const pending = errands.filter((e) => e.completedAt === null);
  const completed = errands.filter((e) => e.completedAt !== null);

  console.log();

  if (pending.length > 0) {
    console.log(colors.yellow(`Pending (${pending.length})`));
    for (const errand of pending) {
      console.log(`  ${colors.yellow("•")} ${errand.name}`);
    }
    console.log();
  }

  if (completed.length > 0) {
    console.log(colors.dim(`Recently Completed (${completed.length})`));
    for (const errand of completed) {
      // completedAt is guaranteed non-null here since we filtered for it
      const completedAt = errand.completedAt as Date;
      const completedStr = formatCompletedDate(completedAt);
      console.log(
        `  ${colors.dim("✓")} ${colors.strikethrough(colors.dim(errand.name))}  ${colors.dim(completedStr)}`,
      );
    }
    console.log();
  }
}

/**
 * Add a new errand
 */
export async function errandAddCommand(db: Database): Promise<void> {
  const name = await Input.prompt({
    message: "What needs to be done?",
  });

  if (!name.trim()) {
    console.log(colors.red("Errand name cannot be empty."));
    return;
  }

  const errand = await createErrand(db, { name: name.trim() });
  console.log(`\nAdded: ${colors.yellow(errand.name)}`);
}

/**
 * Mark an errand as complete
 */
export async function errandDoneCommand(db: Database): Promise<void> {
  const pending = await listPendingErrands(db);

  if (pending.length === 0) {
    console.log(colors.dim("\nNo pending errands."));
    return;
  }

  const errandId = await Select.prompt({
    message: "Which errand is done?",
    options: pending.map((e) => ({
      name: e.name,
      value: e.id,
    })),
  });

  const errand = await completeErrand(db, errandId);
  console.log(`\n${colors.green("✓")} ${colors.strikethrough(errand.name)}`);
}

/**
 * Format completion date relative to now
 */
function formatCompletedDate(date: Date): string {
  const now = new Date();
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
