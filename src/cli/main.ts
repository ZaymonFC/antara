/**
 * Antara CLI - Entry point
 *
 * Commands:
 * - antara        → Show help
 * - antara log    → Log a completion or duration
 * - antara create → Create a new activity
 * - antara status → Show progress for all activities
 * - antara errand → Manage one-off errands
 */

import { Command } from "@cliffy/command";
import { initDatabase } from "../db/connection.ts";
import { createCommand } from "./commands/create.ts";
import { editCommand } from "./commands/edit.ts";
import { errandAddCommand, errandDoneCommand, errandListCommand } from "./commands/errand.ts";
import { logCommand } from "./commands/log.ts";
import { statusCommand } from "./commands/status.ts";

const db = await initDatabase();

const cmd = new Command()
  .name("antara")
  .version("0.1.0")
  .description("अन्तर (antara) - Tune the rhythms of life.")
  .action(function () {
    this.showHelp();
  })
  .command("log", "Log a completion or duration for an activity")
  .action(async () => {
    await logCommand(db);
  })
  .command("create", "Create a new activity")
  .action(async () => {
    await createCommand(db);
  })
  .command("edit", "Edit an existing activity")
  .action(async () => {
    await editCommand(db);
  })
  .command("status", "Show progress for all activities")
  .action(async () => {
    await statusCommand(db);
  })
  .command(
    "errand",
    new Command()
      .description("Manage one-off errands")
      .action(async () => {
        await errandListCommand(db);
      })
      .command("add", "Add a new errand")
      .action(async () => {
        await errandAddCommand(db);
      })
      .reset()
      .command("done", "Mark an errand as complete")
      .action(async () => {
        await errandDoneCommand(db);
      }),
  );
await cmd.parse(Deno.args);
