/**
 * Log command - Default flow for logging activity completions/durations
 */

import { Input, Select } from "@cliffy/prompt";
import type { Database } from "../../db/connection.ts";
import { listActivities } from "../../lib/activities.ts";
import { recordCompletion, recordDuration } from "../../lib/history.ts";

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
    console.log(`\nLogged ${minutes} minutes for "${activity.name}"`);
  } else {
    await recordCompletion(db, { activityId });
    console.log(`\nLogged completion for "${activity.name}"`);
  }
}
