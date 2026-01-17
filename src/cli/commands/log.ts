/**
 * Log command - Record activity completions/durations
 */

import { Input, Select } from "@cliffy/prompt";
import type { Database } from "../../db/connection.ts";
import { listActivities } from "../../lib/activities.ts";
import { recordCompletion, recordDuration } from "../../lib/history.ts";
import { displaySingleActivity } from "../status/display.ts";
import { loadActivityWithProgress } from "../status/loader.ts";

export async function logCommand(db: Database): Promise<void> {
  const activities = await listActivities(db);

  if (activities.length === 0) {
    console.log("No activities yet. Run `antara create` to create one.");
    return;
  }

  const activityId = await Select.prompt({
    message: "Activity",
    search: true,
    options: activities.map((a) => ({
      name: a.name,
      value: a.id,
    })),
  });

  const activity = activities.find((a) => a.id === activityId);
  if (!activity) return;

  if (activity.measurement === "duration") {
    const minutesStr = await Input.prompt({
      message: "Minutes",
    });
    const minutes = parseInt(minutesStr, 10);
    await recordDuration(db, { activityId, minutes });
  } else {
    await recordCompletion(db, { activityId });
  }

  // Show updated status for this activity
  const item = await loadActivityWithProgress(db, activityId);
  if (item) {
    displaySingleActivity(item);
  }
}
