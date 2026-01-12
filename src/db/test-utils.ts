/**
 * Test utilities for database operations
 *
 * Provides fresh in-memory SQLite databases for isolated testing
 */

import { createDatabase, type Database } from "./connection.ts";
import { sql } from "drizzle-orm";

/**
 * SQL statement to create rhythms table
 * Must be created first (referenced by activities)
 */
const CREATE_RHYTHMS_TABLE = sql`
  CREATE TABLE rhythms (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    kind TEXT NOT NULL,
    trailing_count INTEGER,
    trailing_unit TEXT,
    recurring_every INTEGER,
    recurring_unit TEXT,
    calendar_period TEXT,
    created_at INTEGER NOT NULL
  )
`;

/**
 * SQL statement to create activities table
 * References rhythms table via rhythm_id foreign key
 */
const CREATE_ACTIVITIES_TABLE = sql`
  CREATE TABLE activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    framing TEXT NOT NULL,
    rhythm_id INTEGER NOT NULL REFERENCES rhythms(id),
    target INTEGER NOT NULL,
    measurement TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`;

/**
 * SQL statement to create history table
 * References activities table via activity_id foreign key
 */
const CREATE_HISTORY_TABLE = sql`
  CREATE TABLE history (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    minutes INTEGER,
    timestamp INTEGER NOT NULL
  )
`;

/**
 * Create a fresh in-memory database for testing
 *
 * Each call returns an isolated database instance.
 * Tables are created directly (no migrations needed).
 * Creation order: rhythms -> activities -> history (foreign key dependencies)
 *
 * @example
 * ```typescript
 * import { createTestDatabase } from "./test-utils.ts";
 *
 * Deno.test("my test", async () => {
 *   const db = await createTestDatabase();
 *   // ... test with db
 * });
 * ```
 */
export async function createTestDatabase(): Promise<Database> {
  const db = createDatabase(":memory:");

  // Create tables in order (foreign key dependencies)
  await db.run(CREATE_RHYTHMS_TABLE);
  await db.run(CREATE_ACTIVITIES_TABLE);
  await db.run(CREATE_HISTORY_TABLE);

  return db;
}
