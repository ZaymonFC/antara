/**
 * Completion cache for shell tab-completion.
 * Writes activity names to a plain text file so completions
 * don't need to boot the full CLI + database.
 */

import { join } from "@std/path";
import type { Database } from "../db/connection.ts";
import { getDataDir } from "../db/connection.ts";
import { listActivities } from "../lib/activities.ts";

// Keep in sync with completions/_antara
function getCachePath(): string {
  return join(getDataDir(), "completions-cache");
}

export async function updateCompletionCache(db: Database): Promise<void> {
  const activities = await listActivities(db);
  const names = activities.map((a) => a.name).join("\n");
  await Deno.writeTextFile(getCachePath(), names);
}
