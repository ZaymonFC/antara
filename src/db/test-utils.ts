/**
 * Test utilities for database operations
 *
 * Provides fresh in-memory SQLite databases for isolated testing
 */

import { dirname, fromFileUrl, join } from "@std/path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createDatabase, type Database } from "./connection.ts";

/**
 * Get the migrations folder path, resolved relative to this module
 */
function getMigrationsFolder(): string {
  const moduleDir = dirname(fromFileUrl(import.meta.url));
  return join(moduleDir, "../../drizzle");
}

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
  await migrate(db, { migrationsFolder: getMigrationsFolder() });
  return db;
}
