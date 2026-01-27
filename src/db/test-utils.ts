/**
 * Test utilities for database operations
 *
 * Provides fresh in-memory SQLite databases for isolated testing.
 * Each test creates its own database instance to enable parallel execution.
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

/**
 * Run a test with an isolated database instance
 *
 * This wrapper enables parallel test execution by creating
 * a fresh database for each test, avoiding shared mutable state.
 *
 * @example
 * ```typescript
 * import { withTestDb } from "../db/test-utils.ts";
 *
 * it("should do something", async () => {
 *   await withTestDb(async (db) => {
 *     // test with isolated db
 *   });
 * });
 * ```
 */
export async function withTestDb<T>(fn: (db: Database) => Promise<T>): Promise<T> {
  const db = await createTestDatabase();
  return fn(db);
}

/**
 * Test context with database and a pre-created rhythm
 *
 * Use this for tests that require activities (which need a rhythm).
 */
export interface TestContext {
  db: Database;
  rhythmId: number;
}

/**
 * Run a test with an isolated database and pre-created rhythm
 *
 * Convenience wrapper for activity/history tests that need a rhythm.
 *
 * @example
 * ```typescript
 * import { withTestContext } from "../db/test-utils.ts";
 *
 * it("should do something", async () => {
 *   await withTestContext(async ({ db, rhythmId }) => {
 *     const activity = await createActivity(db, { rhythmId, ... });
 *   });
 * });
 * ```
 */
export async function withTestContext<T>(fn: (ctx: TestContext) => Promise<T>): Promise<T> {
  const { createCalendarRhythm } = await import("../lib/rhythms.ts");
  const db = await createTestDatabase();
  const rhythm = await createCalendarRhythm(db, { period: "weekly" });
  return fn({ db, rhythmId: rhythm.id });
}
