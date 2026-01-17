/**
 * Load activities with computed progress.
 */

import type { Database } from "../../db/connection.ts";
import { getActivity, listActivities } from "../../lib/activities.ts";
import { getActivityHistory } from "../../lib/history.ts";
import { getProgress } from "../../lib/progress.ts";
import { getRhythm } from "../../lib/rhythms.ts";
import type { ActivityWithProgress } from "./types.ts";

/**
 * Load all activities with their computed progress.
 */
export async function loadActivitiesWithProgress(
  db: Database,
  now: Date = new Date(),
): Promise<ActivityWithProgress[]> {
  const activities = await listActivities(db);
  const items: ActivityWithProgress[] = [];

  for (const activity of activities) {
    const rhythm = await getRhythm(db, activity.rhythmId);
    if (!rhythm) continue;

    const history = await getActivityHistory(db, activity.id);
    const progress = getProgress(activity, rhythm, history, now);

    items.push({
      id: activity.id,
      name: activity.name,
      progress,
      rhythm,
      measurement: activity.measurement as "instances" | "duration",
    });
  }

  return items;
}

/**
 * Load a single activity with its computed progress.
 */
export async function loadActivityWithProgress(
  db: Database,
  activityId: number,
  now: Date = new Date(),
): Promise<ActivityWithProgress | undefined> {
  const activity = await getActivity(db, activityId);
  if (!activity) return undefined;

  const rhythm = await getRhythm(db, activity.rhythmId);
  if (!rhythm) return undefined;

  const history = await getActivityHistory(db, activity.id);
  const progress = getProgress(activity, rhythm, history, now);

  return {
    id: activity.id,
    name: activity.name,
    progress,
    rhythm,
    measurement: activity.measurement as "instances" | "duration",
  };
}
