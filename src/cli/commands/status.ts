/**
 * Status command - Display progress for all activities
 */

import type { Database } from "../../db/connection.ts";
import { displayFullStatus } from "../status/display.ts";
import { loadActivitiesWithProgress } from "../status/loader.ts";

export async function statusCommand(db: Database): Promise<void> {
  const items = await loadActivitiesWithProgress(db);

  if (items.length === 0) {
    console.log("No activities yet. Run `antara create` to create one.");
    return;
  }

  displayFullStatus(items);
}
