/**
 * Test utilities for database operations
 *
 * Provides fresh in-memory SQLite databases for isolated testing
 */

import { migrate } from "drizzle-orm/libsql/migrator";
import { createDatabase, type Database } from "./connection.ts";

/**
 * Create a fresh in-memory database for testing
 *
 * Each call returns an isolated database instance with schema
 * applied via Drizzle migrations (single source of truth).
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
  await migrate(db, { migrationsFolder: "./drizzle" });
  return db;
}
