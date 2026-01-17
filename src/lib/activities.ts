/**
 * Activities library - CRUD operations for unified activity model
 *
 * Activities combine a framing (task or pursuit) with a rhythm, target, and measurement.
 * The framing determines UX presentation; the measurement determines how progress is tracked.
 *
 * Constraint: task framing requires instances measurement (tasks are checkbox-style).
 */

import { eq, like } from "drizzle-orm";
import type { Database } from "../db/connection.ts";
import { type Activity, activities, type NewActivity } from "../db/schema.ts";
import type { Framing, Measurement } from "../types.ts";

// =============================================================================
// Create
// =============================================================================

/**
 * Create a new activity (unified - works for both task and pursuit framing)
 *
 * @throws Error if framing is "task" but measurement is not "instances"
 */
export async function createActivity(
  db: Database,
  input: {
    name: string;
    framing: Framing;
    rhythmId: number;
    target: number;
    measurement: Measurement;
  },
): Promise<Activity> {
  // Enforce constraint: tasks must use instances measurement
  if (input.framing === "task" && input.measurement !== "instances") {
    throw new Error("Tasks must use instances measurement");
  }

  const result = await db
    .insert(activities)
    .values({
      name: input.name,
      framing: input.framing,
      rhythmId: input.rhythmId,
      target: input.target,
      measurement: input.measurement,
    })
    .returning()
    .get();

  return result;
}

// =============================================================================
// Read
// =============================================================================

/**
 * Retrieve an activity by ID
 */
export async function getActivity(db: Database, id: number): Promise<Activity | undefined> {
  const result = await db.select().from(activities).where(eq(activities.id, id)).get();

  return result;
}

/**
 * List all activities, optionally filtered by framing
 */
export async function listActivities(
  db: Database,
  filter?: { framing?: Framing },
): Promise<Activity[]> {
  if (filter?.framing) {
    return await db.select().from(activities).where(eq(activities.framing, filter.framing)).all();
  }

  return await db.select().from(activities).all();
}

/**
 * Search activities by name (case-insensitive partial match)
 */
export async function searchActivities(db: Database, query: string): Promise<Activity[]> {
  // SQLite LIKE is case-insensitive by default for ASCII
  const pattern = `%${query}%`;

  return await db.select().from(activities).where(like(activities.name, pattern)).all();
}

// =============================================================================
// Update / Delete
// =============================================================================

/**
 * Update an activity's fields
 * Returns the updated activity, or undefined if not found
 */
export async function updateActivity(
  db: Database,
  id: number,
  changes: Partial<Omit<NewActivity, "id" | "createdAt">>,
): Promise<Activity | undefined> {
  const result = await db
    .update(activities)
    .set(changes)
    .where(eq(activities.id, id))
    .returning()
    .get();

  return result;
}

/**
 * Rename an activity
 * Returns the updated activity, or undefined if not found
 * Note: History is linked by activity_id, so renaming does not affect history
 */
export async function renameActivity(
  db: Database,
  id: number,
  newName: string,
): Promise<Activity | undefined> {
  return updateActivity(db, id, { name: newName });
}

/**
 * Delete an activity by ID
 * Returns true if deleted, false if not found
 * Note: History events cascade delete via FK constraint
 */
export async function deleteActivity(db: Database, id: number): Promise<boolean> {
  const result = await db.delete(activities).where(eq(activities.id, id)).returning().get();

  return result !== undefined;
}
