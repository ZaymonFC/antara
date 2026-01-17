/**
 * Create command - Interactive activity creation
 */

import type { Database } from "../../db/connection.ts";
import { collectActivityForm } from "../forms/collect.ts";
import { persistNewActivity } from "../forms/persist.ts";

export async function createCommand(db: Database): Promise<void> {
  const form = await collectActivityForm();
  const result = await persistNewActivity(db, form);

  const unit = result.measurement === "duration" ? "minutes" : "times";
  console.log(`\nCreated "${result.name}" - ${result.target} ${unit} ${result.rhythmDescription}`);
}
