/**
 * Antara CLI - Entry point
 *
 * Commands:
 * - antara        → Log an activity (default)
 * - antara create → Create a new activity
 */

import { Command } from "@cliffy/command";
import { getDatabase } from "../db/connection.ts";
import { createCommand } from "./commands/create.ts";
import { logCommand } from "./commands/log.ts";

const db = getDatabase();

await new Command()
  .name("antara")
  .version("0.1.0")
  .description("Track the rhythms of life")
  .action(async () => {
    await logCommand(db);
  })
  .command("create", "Create a new activity")
  .action(async () => {
    await createCommand(db);
  })
  .parse(Deno.args);
