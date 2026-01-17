/**
 * Database connection module with dependency injection support
 *
 * Pattern:
 * - createDatabase(url) - Factory function, injectable for tests
 * - getDatabase() - Singleton for production use, auto-migrates
 */

import { type Client, createClient } from "@libsql/client/node";
import { dirname, fromFileUrl, join } from "@std/path";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema.ts";

export type Database = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Create a database connection with the given URL
 * Use getDatabasePath() for production
 * Use ":memory:" for tests
 */
export function createDatabase(url: string): Database {
  const client: Client = createClient({ url });
  return drizzle(client, { schema });
}

/**
 * Get the migrations folder path, resolved relative to this module
 * Works for both local dev and global installs
 */
function getMigrationsFolder(): string {
  const moduleDir = dirname(fromFileUrl(import.meta.url));
  return join(moduleDir, "../../drizzle");
}

/**
 * Run database migrations
 */
async function runMigrations(db: Database): Promise<void> {
  await migrate(db, { migrationsFolder: getMigrationsFolder() });
}

/**
 * Get the database directory path, following XDG spec on Linux
 * Returns ~/.local/share/antara on Linux (or XDG_DATA_HOME/antara)
 * Returns ~/.antara on macOS/Windows
 */
function getDataDir(): string {
  const home = Deno.env.get("HOME") || Deno.env.get("USERPROFILE");
  if (!home) {
    throw new Error("Could not determine home directory");
  }

  // Use XDG_DATA_HOME on Linux, otherwise ~/.antara
  const xdgDataHome = Deno.env.get("XDG_DATA_HOME");
  if (Deno.build.os === "linux") {
    const base = xdgDataHome || `${home}/.local/share`;
    return `${base}/antara`;
  }

  return `${home}/.antara`;
}

/**
 * Get the full database URL, ensuring the directory exists
 */
function getDatabaseUrl(): string {
  const dataDir = getDataDir();

  // Ensure directory exists
  Deno.mkdirSync(dataDir, { recursive: true });

  return `file:${dataDir}/db.sqlite`;
}

// Production singleton
let _db: Database | null = null;
let _initialized = false;

/**
 * Initialize the production database singleton
 * Creates connection and runs migrations
 * Must be called before getDatabase()
 */
export async function initDatabase(): Promise<Database> {
  if (!_db) {
    _db = createDatabase(getDatabaseUrl());
  }
  if (!_initialized) {
    await runMigrations(_db);
    _initialized = true;
  }
  return _db;
}

/**
 * Get the production database singleton
 * Throws if initDatabase() hasn't been called
 */
export function getDatabase(): Database {
  if (!_db || !_initialized) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return _db;
}

/**
 * Reset the production singleton (useful for testing the module itself)
 */
export function resetDatabase(): void {
  _db = null;
  _initialized = false;
}
