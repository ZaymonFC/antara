/**
 * History command - Show recent activity events as a stream
 */

import type { Database } from "../../db/connection.ts";
import { getRecentHistory } from "../../lib/history.ts";

function formatTimestamp(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${d} ${h}:${mi}`;
}

export async function historyCommand(db: Database, n: number): Promise<void> {
  const events = await getRecentHistory(db, n);

  if (events.length === 0) {
    console.log("No history yet.");
    return;
  }

  // Reverse so oldest is first, newest at bottom (chronological stream)
  events.reverse();

  for (const event of events) {
    const ts = formatTimestamp(event.timestamp);
    if (event.kind === "duration") {
      console.log(`${ts}  ⏱ ${event.activityName}  ${event.minutes}m`);
    } else {
      console.log(`${ts}  ✓ ${event.activityName}`);
    }
  }
}
