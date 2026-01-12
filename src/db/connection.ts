/**
 * Database connection module with dependency injection support
 *
 * Pattern:
 * - createDatabase(url) - Factory function, injectable for tests
 * - getDatabase() - Singleton for production use
 */

import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import * as schema from "./schema.ts";

export type Database = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Create a database connection with the given URL
 * Use "file:data/db.sqlite" for production
 * Use ":memory:" for tests
 */
export function createDatabase(url: string): Database {
  const client: Client = createClient({ url });
  return drizzle(client, { schema });
}

// Production singleton
let _db: Database | null = null;

/**
 * Get the production database singleton
 * Creates connection on first call
 */
export function getDatabase(): Database {
  if (!_db) {
    _db = createDatabase("file:data/db.sqlite");
  }
  return _db;
}

/**
 * Reset the production singleton (useful for testing the module itself)
 */
export function resetDatabase(): void {
  _db = null;
}
