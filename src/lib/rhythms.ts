/**
 * Rhythm CRUD operations
 *
 * Rhythms define the temporal pattern for activities:
 * - Trailing: sliding window from now (e.g., "in the last 7 days")
 * - Recurring: resets from last completion (e.g., "every 5 days")
 * - Calendar: fixed calendar periods (e.g., "per week")
 */

import { eq } from "drizzle-orm";
import type { Database } from "../db/connection.ts";
import { type Rhythm as DbRhythm, rhythms } from "../db/schema.ts";
import type { CalendarPeriod, Rhythm, TimeUnit } from "../types.ts";

/**
 * Convert a database rhythm row to a domain Rhythm type
 */
function toRhythm(row: DbRhythm): Rhythm {
  switch (row.kind) {
    case "trailing":
      return {
        kind: "trailing",
        count: row.trailingCount!,
        unit: row.trailingUnit! as TimeUnit,
      };
    case "recurring":
      return {
        kind: "recurring",
        every: row.recurringEvery!,
        unit: row.recurringUnit! as TimeUnit,
      };
    case "calendar":
      return {
        kind: "calendar",
        period: row.calendarPeriod! as CalendarPeriod,
      };
    default:
      throw new Error(`Unknown rhythm kind: ${row.kind}`);
  }
}

/**
 * Create a trailing rhythm (sliding window from now)
 */
export async function createTrailingRhythm(
  db: Database,
  input: { count: number; unit: TimeUnit },
): Promise<DbRhythm> {
  const [rhythm] = await db
    .insert(rhythms)
    .values({
      kind: "trailing",
      trailingCount: input.count,
      trailingUnit: input.unit,
    })
    .returning();
  return rhythm;
}

/**
 * Create a recurring rhythm (resets from last completion)
 */
export async function createRecurringRhythm(
  db: Database,
  input: { every: number; unit: TimeUnit },
): Promise<DbRhythm> {
  const [rhythm] = await db
    .insert(rhythms)
    .values({
      kind: "recurring",
      recurringEvery: input.every,
      recurringUnit: input.unit,
    })
    .returning();
  return rhythm;
}

/**
 * Create a calendar rhythm (fixed calendar periods)
 */
export async function createCalendarRhythm(
  db: Database,
  input: { period: CalendarPeriod },
): Promise<DbRhythm> {
  const [rhythm] = await db
    .insert(rhythms)
    .values({
      kind: "calendar",
      calendarPeriod: input.period,
    })
    .returning();
  return rhythm;
}

/**
 * Get a rhythm by ID and convert to domain type
 */
export async function getRhythm(db: Database, id: number): Promise<Rhythm | undefined> {
  const [row] = await db.select().from(rhythms).where(eq(rhythms.id, id));
  if (!row) return undefined;
  return toRhythm(row);
}

/**
 * Get raw rhythm row by ID (for internal use)
 */
export async function getRhythmRow(db: Database, id: number): Promise<DbRhythm | undefined> {
  const [row] = await db.select().from(rhythms).where(eq(rhythms.id, id));
  return row;
}

/**
 * Delete a rhythm by ID
 */
export async function deleteRhythm(db: Database, id: number): Promise<boolean> {
  const result = await db.delete(rhythms).where(eq(rhythms.id, id));
  return result.rowsAffected > 0;
}
