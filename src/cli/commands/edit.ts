/**
 * Edit command - Interactive activity editing with pre-filled values
 */

import { Select } from "@cliffy/prompt";
import type { Database } from "../../db/connection.ts";
import { getActivity, listActivities } from "../../lib/activities.ts";
import { getRhythm } from "../../lib/rhythms.ts";
import { collectActivityForm } from "../forms/collect.ts";
import { persistActivityUpdate } from "../forms/persist.ts";
import { toFormDefaults } from "../forms/types.ts";

export async function editCommand(db: Database): Promise<void> {
  const activities = await listActivities(db);

  if (activities.length === 0) {
    console.log("No activities yet. Run `antara create` to create one.");
    return;
  }

  // Select activity to edit
  const activityId = await Select.prompt({
    message: "Select activity to edit",
    search: true,
    options: activities.map((a) => ({
      name: a.name,
      value: a.id,
    })),
  });

  const activity = await getActivity(db, activityId);
  if (!activity) {
    console.log("Activity not found.");
    return;
  }

  const currentRhythm = await getRhythm(db, activity.rhythmId);
  if (!currentRhythm) {
    console.log("Activity rhythm not found.");
    return;
  }

  // Collect form with pre-filled defaults
  const defaults = toFormDefaults(activity, currentRhythm);
  const form = await collectActivityForm(defaults);
  const result = await persistActivityUpdate(db, activity.id, activity.rhythmId, form);

  const unit = result.measurement === "duration" ? "minutes" : "times";
  console.log(`\nUpdated "${result.name}" - ${result.target} ${unit} ${result.rhythmDescription}`);
}
