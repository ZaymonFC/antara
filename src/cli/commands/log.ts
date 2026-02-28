/**
 * Log command - Record activity completions/durations
 */

import { Input, Select } from "@cliffy/prompt";
import type { Database } from "../../db/connection.ts";
import { listActivities } from "../../lib/activities.ts";
import { recordCompletion, recordDuration } from "../../lib/history.ts";
import { matchActivity } from "../../lib/matching.ts";
import { displaySingleActivity } from "../status/display.ts";
import { loadActivityWithProgress } from "../status/loader.ts";

export async function logCommand(db: Database, name?: string): Promise<void> {
  const activities = await listActivities(db);

  if (activities.length === 0) {
    console.log("No activities yet. Run `antara create` to create one.");
    return;
  }

  let activity: (typeof activities)[number] | undefined;

  if (name) {
    const names = activities.map((a) => a.name);
    const result = matchActivity(name, names);

    if (result.kind === "exact") {
      activity = activities.find((a) => a.name === result.name);
    } else if (result.kind === "suggestions") {
      const chosen = await Select.prompt({
        message: "Did you mean?",
        options: result.names.map((n) => ({
          name: n,
          value: n,
        })),
      });
      activity = activities.find((a) => a.name === chosen);
    } else {
      console.log(`No activity matching "${name}".`);
      return;
    }
  } else {
    const activityId = await Select.prompt({
      message: "Activity",
      search: true,
      options: activities.map((a) => ({
        name: a.name,
        value: a.id,
      })),
    });
    activity = activities.find((a) => a.id === activityId);
  }

  if (!activity) return;

  if (activity.measurement === "duration") {
    const minutesStr = await Input.prompt({
      message: "Minutes",
    });
    const minutes = parseInt(minutesStr, 10);
    await recordDuration(db, { activityId: activity.id, minutes });
  } else {
    await recordCompletion(db, { activityId: activity.id });
  }

  // Show updated status for this activity
  const item = await loadActivityWithProgress(db, activity.id);
  if (item) {
    displaySingleActivity(item);
  }
}
