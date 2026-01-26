/**
 * Errands library - CRUD operations for one-off tasks
 *
 * Errands are due immediately upon creation. Once completed, they remain
 * visible for 3 days before being hidden from the default list view.
 */

import { and, eq, gt, isNotNull, isNull, or } from "drizzle-orm";
import type { Database } from "../db/connection.ts";
import { type Errand, errands } from "../db/schema.ts";

/** How long completed errands remain visible (in milliseconds) */
const VISIBILITY_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

// =============================================================================
// Create
// =============================================================================

/**
 * Create a new errand
 */
export async function createErrand(db: Database, input: { name: string }): Promise<Errand> {
  const result = await db.insert(errands).values({ name: input.name }).returning().get();

  return result;
}

// =============================================================================
// Read
// =============================================================================

/**
 * Retrieve an errand by ID
 */
export async function getErrand(db: Database, id: number): Promise<Errand | undefined> {
  return await db.select().from(errands).where(eq(errands.id, id)).get();
}

/**
 * List errands with visibility filtering
 *
 * By default, returns:
 * - All pending errands (completedAt is null)
 * - Completed errands within the last 3 days
 *
 * With includeExpired: true, returns all errands
 */
export async function listErrands(
  db: Database,
  options: { includeExpired?: boolean; now?: Date } = {},
): Promise<Errand[]> {
  const { includeExpired = false, now = new Date() } = options;

  if (includeExpired) {
    return await db.select().from(errands).all();
  }

  // Cutoff: 3 days ago from now
  const cutoff = new Date(now.getTime() - VISIBILITY_WINDOW_MS);

  // Return pending OR (completed AND completed within last 3 days)
  return await db
    .select()
    .from(errands)
    .where(
      or(
        isNull(errands.completedAt),
        and(isNotNull(errands.completedAt), gt(errands.completedAt, cutoff)),
      ),
    )
    .all();
}

/**
 * List only pending (incomplete) errands
 */
export async function listPendingErrands(db: Database): Promise<Errand[]> {
  return await db.select().from(errands).where(isNull(errands.completedAt)).all();
}

// =============================================================================
// Update
// =============================================================================

/**
 * Mark an errand as complete
 *
 * @throws Error if errand not found
 * @throws Error if errand already completed
 */
export async function completeErrand(
  db: Database,
  id: number,
  timestamp: Date = new Date(),
): Promise<Errand> {
  const existing = await getErrand(db, id);

  if (!existing) {
    throw new Error(`Errand with id ${id} not found`);
  }

  if (existing.completedAt !== null) {
    throw new Error(`Errand "${existing.name}" is already completed`);
  }

  const result = await db
    .update(errands)
    .set({ completedAt: timestamp })
    .where(eq(errands.id, id))
    .returning()
    .get();

  return result;
}

// =============================================================================
// Delete
// =============================================================================

/**
 * Delete an errand by ID
 * Returns true if deleted, false if not found
 */
export async function deleteErrand(db: Database, id: number): Promise<boolean> {
  const result = await db.delete(errands).where(eq(errands.id, id)).returning().get();

  return result !== undefined;
}
