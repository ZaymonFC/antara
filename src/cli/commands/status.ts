/**
 * Status command - Display progress for all activities and errands
 */

import type { Database } from "../../db/connection.ts";
import { listErrands } from "../../lib/errands.ts";
import { displayFullStatus } from "../status/display.ts";
import { loadActivitiesWithProgress } from "../status/loader.ts";

export async function statusCommand(db: Database): Promise<void> {
  const items = await loadActivitiesWithProgress(db);
  const errands = await listErrands(db);

  if (items.length === 0 && errands.length === 0) {
    console.log("No activities or errands yet. Run `antara create` or `antara errand add`.");
    return;
  }

  displayFullStatus(items, errands);
}
