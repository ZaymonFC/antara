/**
 * History library - Event store for activity completions and duration logs
 *
 * Records domain events:
 * - UserCompletedActivity: completion events for instances measurement
 * - UserLoggedActivityDuration: duration events for duration measurement
 *
 * Validation ensures events match activity measurement type.
 */

import { and, desc, eq, gte, lte } from "drizzle-orm";
import type { Database } from "../db/connection.ts";
import { activities, type HistoryEvent, history } from "../db/schema.ts";

// =============================================================================
// Create
// =============================================================================

/**
 * Record a completion event for an activity (instances measurement)
 *
 * Domain event: UserCompletedActivity
 *
 * @throws Error if activity does not exist
 * @throws Error if activity uses duration measurement (must use recordDuration)
 */
export async function recordCompletion(
  db: Database,
  input: {
    activityId: number;
    timestamp?: Date;
  },
): Promise<HistoryEvent> {
  // Verify activity exists and has correct measurement type
  const activity = await db
    .select()
    .from(activities)
    .where(eq(activities.id, input.activityId))
    .get();

  if (!activity) {
    throw new Error("Activity not found");
  }

  if (activity.measurement === "duration") {
    throw new Error("Cannot record completion for duration-measurement activity");
  }

  const result = await db
    .insert(history)
    .values({
      activityId: input.activityId,
      kind: "completion",
      timestamp: input.timestamp ?? new Date(),
    })
    .returning()
    .get();

  return result;
}

/**
 * Record a duration event for an activity (duration measurement)
 *
 * Domain event: UserLoggedActivityDuration
 *
 * @throws Error if activity does not exist
 * @throws Error if activity uses instances measurement (must use recordCompletion)
 */
export async function recordDuration(
  db: Database,
  input: {
    activityId: number;
    minutes: number;
    timestamp?: Date;
  },
): Promise<HistoryEvent> {
  // Verify activity exists and has correct measurement type
  const activity = await db
    .select()
    .from(activities)
    .where(eq(activities.id, input.activityId))
    .get();

  if (!activity) {
    throw new Error("Activity not found");
  }

  if (activity.measurement === "instances") {
    throw new Error("Cannot record duration for instances-measurement activity");
  }

  const result = await db
    .insert(history)
    .values({
      activityId: input.activityId,
      kind: "duration",
      minutes: input.minutes,
      timestamp: input.timestamp ?? new Date(),
    })
    .returning()
    .get();

  return result;
}

// =============================================================================
// Read
// =============================================================================

/**
 * Get history events for an activity with optional date range filtering
 *
 * Results are returned in descending order by timestamp (most recent first).
 */
export async function getActivityHistory(
  db: Database,
  activityId: number,
  options?: {
    from?: Date;
    to?: Date;
    limit?: number;
  },
): Promise<HistoryEvent[]> {
  const conditions = [eq(history.activityId, activityId)];

  if (options?.from) {
    conditions.push(gte(history.timestamp, options.from));
  }

  if (options?.to) {
    conditions.push(lte(history.timestamp, options.to));
  }

  const query = db
    .select()
    .from(history)
    .where(and(...conditions))
    .orderBy(desc(history.timestamp))
    .$dynamic();

  if (options?.limit) {
    return await query.limit(options.limit).all();
  }

  return await query.all();
}

/**
 * Get recent history across all activities
 *
 * Results are returned in descending order by timestamp (most recent first).
 */
export async function getRecentHistory(db: Database, limit: number = 10): Promise<HistoryEvent[]> {
  return await db.select().from(history).orderBy(desc(history.timestamp)).limit(limit).all();
}

// =============================================================================
// Delete
// =============================================================================

/**
 * Delete a history event by ID
 *
 * @returns true if deleted, false if not found
 */
export async function deleteHistoryEvent(db: Database, id: number): Promise<boolean> {
  const result = await db.delete(history).where(eq(history.id, id)).returning().get();

  return result !== undefined;
}
