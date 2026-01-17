/**
 * Prompt orchestration for activity forms.
 * Composes individual prompts into a complete form flow.
 */

import type { RhythmKind } from "../../types.ts";
import {
  promptCalendarPeriod,
  promptFraming,
  promptMeasurement,
  promptName,
  promptNumber,
  promptRhythmType,
  promptTarget,
  promptTimeUnit,
} from "./prompts.ts";
import type { ActivityFormData, ActivityFormDefaults, RhythmFormData } from "./types.ts";

/**
 * Collect rhythm parameters based on rhythm type.
 */
async function collectRhythmParams(
  kind: RhythmKind,
  defaults: ActivityFormDefaults,
): Promise<RhythmFormData> {
  switch (kind) {
    case "calendar": {
      const period = await promptCalendarPeriod(defaults.rhythmPeriod);
      return { kind: "calendar", period };
    }
    case "trailing": {
      const unit = await promptTimeUnit("In the last", defaults.rhythmUnit);
      const count = await promptNumber(`How many ${unit}?`, defaults.rhythmCount);
      return { kind: "trailing", count, unit };
    }
    case "recurring": {
      const unit = await promptTimeUnit("Every", defaults.rhythmUnit);
      const every = await promptNumber(`Every how many ${unit}?`, defaults.rhythmEvery);
      return { kind: "recurring", every, unit };
    }
  }
}

/**
 * Collect complete activity form data through interactive prompts.
 *
 * Flow: name → framing → measurement (if pursuit) → rhythm type → rhythm params → target
 */
export async function collectActivityForm(
  defaults: ActivityFormDefaults = {},
): Promise<ActivityFormData> {
  // 1. Name
  const name = await promptName(defaults.name);

  // 2. Framing
  const framing = await promptFraming(defaults.framing);

  // 3. Measurement (only for pursuits, tasks are always "instances")
  let measurement: "instances" | "duration" = "instances";
  if (framing === "pursuit") {
    // When switching from task to pursuit, don't carry over default
    const measurementDefault = defaults.framing === "pursuit" ? defaults.measurement : undefined;
    measurement = await promptMeasurement(measurementDefault);
  }

  // 4. Rhythm type
  const rhythmKind = await promptRhythmType(defaults.rhythmKind);

  // 5. Rhythm parameters (branched by type)
  const rhythm = await collectRhythmParams(rhythmKind, defaults);

  // 6. Target
  const target = await promptTarget(measurement, defaults.target);

  return { name, framing, measurement, rhythm, target };
}
