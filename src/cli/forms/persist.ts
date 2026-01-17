/**
 * Persistence operations for activity forms.
 * Separates DB operations from prompt logic.
 */

import type { Database } from "../../db/connection.ts";
import { createActivity, updateActivity } from "../../lib/activities.ts";
import {
  createCalendarRhythm,
  createRecurringRhythm,
  createTrailingRhythm,
  deleteRhythm,
} from "../../lib/rhythms.ts";
import type { ActivityFormData, RhythmFormData } from "./types.ts";

/**
 * Result of creating/updating an activity - includes data for confirmation message.
 */
export interface PersistResult {
  id: number;
  name: string;
  target: number;
  measurement: "instances" | "duration";
  rhythmDescription: string;
}

/**
 * Build human-readable rhythm description from form data.
 */
export function describeRhythm(rhythm: RhythmFormData): string {
  switch (rhythm.kind) {
    case "calendar":
      return `per ${rhythm.period.replace("ly", "")}`;
    case "trailing":
      return `in the last ${rhythm.count} ${rhythm.unit}`;
    case "recurring":
      return `every ${rhythm.every} ${rhythm.unit}`;
  }
}

/**
 * Create a rhythm in the database from form data.
 */
async function persistRhythm(db: Database, rhythm: RhythmFormData): Promise<number> {
  switch (rhythm.kind) {
    case "calendar": {
      const row = await createCalendarRhythm(db, { period: rhythm.period });
      return row.id;
    }
    case "trailing": {
      const row = await createTrailingRhythm(db, { count: rhythm.count, unit: rhythm.unit });
      return row.id;
    }
    case "recurring": {
      const row = await createRecurringRhythm(db, { every: rhythm.every, unit: rhythm.unit });
      return row.id;
    }
  }
}

/**
 * Persist a new activity from form data.
 */
export async function persistNewActivity(
  db: Database,
  form: ActivityFormData,
): Promise<PersistResult> {
  const rhythmId = await persistRhythm(db, form.rhythm);

  const activity = await createActivity(db, {
    name: form.name,
    framing: form.framing,
    rhythmId,
    target: form.target,
    measurement: form.measurement,
  });

  return {
    id: activity.id,
    name: activity.name,
    target: form.target,
    measurement: form.measurement,
    rhythmDescription: describeRhythm(form.rhythm),
  };
}

/**
 * Update an existing activity from form data.
 * Creates new rhythm, updates activity, deletes old rhythm if changed.
 */
export async function persistActivityUpdate(
  db: Database,
  activityId: number,
  oldRhythmId: number,
  form: ActivityFormData,
): Promise<PersistResult> {
  const newRhythmId = await persistRhythm(db, form.rhythm);

  await updateActivity(db, activityId, {
    name: form.name,
    framing: form.framing,
    rhythmId: newRhythmId,
    target: form.target,
    measurement: form.measurement,
  });

  // Clean up orphaned rhythm if it changed
  if (newRhythmId !== oldRhythmId) {
    await deleteRhythm(db, oldRhythmId);
  }

  return {
    id: activityId,
    name: form.name,
    target: form.target,
    measurement: form.measurement,
    rhythmDescription: describeRhythm(form.rhythm),
  };
}
