/**
 * Types for activity status display.
 */

import type { ProgressStatus } from "../../lib/progress.ts";
import type { Rhythm } from "../../types.ts";

/**
 * Activity with computed progress - ready for rendering.
 */
export interface ActivityWithProgress {
  id: number;
  name: string;
  progress: ProgressStatus;
  rhythm: Rhythm;
  measurement: "instances" | "duration";
}
