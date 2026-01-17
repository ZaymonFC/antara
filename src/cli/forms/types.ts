/**
 * Form data types for activity create/edit flows.
 * Separates UI concerns (form state) from persistence (DB IDs).
 */

import type {
  CalendarPeriod,
  Framing,
  Measurement,
  Rhythm,
  RhythmKind,
  TimeUnit,
} from "../../types.ts";

/**
 * Rhythm configuration as collected from prompts.
 * Mirrors domain Rhythm but without DB concerns.
 */
export type RhythmFormData =
  | { kind: "calendar"; period: CalendarPeriod }
  | { kind: "trailing"; count: number; unit: TimeUnit }
  | { kind: "recurring"; every: number; unit: TimeUnit };

/**
 * Complete activity form data - everything needed to create/update an activity.
 */
export interface ActivityFormData {
  name: string;
  framing: Framing;
  measurement: Measurement;
  rhythm: RhythmFormData;
  target: number;
}

/**
 * Optional defaults for pre-filling prompts (edit mode).
 * undefined means "no default" (create mode).
 */
export interface ActivityFormDefaults {
  name?: string;
  framing?: Framing;
  measurement?: Measurement;
  rhythmKind?: RhythmKind;
  rhythmPeriod?: CalendarPeriod;
  rhythmCount?: number;
  rhythmEvery?: number;
  rhythmUnit?: TimeUnit;
  target?: number;
}

/**
 * Convert existing activity + rhythm to form defaults.
 */
export function toFormDefaults(
  activity: { name: string; framing: Framing; measurement: Measurement; target: number },
  rhythm: Rhythm,
): ActivityFormDefaults {
  const defaults: ActivityFormDefaults = {
    name: activity.name,
    framing: activity.framing,
    measurement: activity.measurement,
    target: activity.target,
    rhythmKind: rhythm.kind,
  };

  switch (rhythm.kind) {
    case "calendar":
      defaults.rhythmPeriod = rhythm.period;
      break;
    case "trailing":
      defaults.rhythmCount = rhythm.count;
      defaults.rhythmUnit = rhythm.unit;
      break;
    case "recurring":
      defaults.rhythmEvery = rhythm.every;
      defaults.rhythmUnit = rhythm.unit;
      break;
  }

  return defaults;
}
