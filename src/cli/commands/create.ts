/**
 * Create command - Interactive activity creation
 */

import { Input, Select } from "@cliffy/prompt";
import type { Database } from "../../db/connection.ts";
import { createActivity } from "../../lib/activities.ts";
import {
  createCalendarRhythm,
  createRecurringRhythm,
  createTrailingRhythm,
} from "../../lib/rhythms.ts";
import type { CalendarPeriod, Framing, Measurement, TimeUnit } from "../../types.ts";

export async function createCommand(db: Database): Promise<void> {
  const name = await Input.prompt({
    message: "What do you want to track?",
  });

  const framing = (await Select.prompt({
    message: "Is this a",
    options: [
      { name: "pursuit - something to grow (e.g., climbing, reading)", value: "pursuit" },
      { name: "task - something to maintain (e.g., clean bathroom)", value: "task" },
    ],
  })) as Framing;

  // For pursuits, ask measurement first so we can phrase target correctly
  let measurement: Measurement = "instances";
  if (framing === "pursuit") {
    measurement = (await Select.prompt({
      message: "How do you measure progress?",
      options: [
        { name: "by counting times (e.g., 3 sessions)", value: "instances" },
        { name: "by tracking minutes (e.g., 150 min)", value: "duration" },
      ],
    })) as Measurement;
  }

  const rhythmType = await Select.prompt({
    message: "How often?",
    options: [
      { name: "per week/month (calendar periods)", value: "calendar" },
      { name: "rolling window (last N days/weeks)", value: "trailing" },
      { name: "recurring (resets when done)", value: "recurring" },
    ],
  });

  let rhythmId: number;
  let rhythmDescription: string;

  if (rhythmType === "calendar") {
    const period = (await Select.prompt({
      message: "Which period?",
      options: [
        { name: "per day", value: "daily" },
        { name: "per week", value: "weekly" },
        { name: "per month", value: "monthly" },
        { name: "per year", value: "yearly" },
      ],
    })) as CalendarPeriod;
    const rhythm = await createCalendarRhythm(db, { period });
    rhythmId = rhythm.id;
    rhythmDescription = `per ${period.replace("ly", "")}`;
  } else if (rhythmType === "trailing") {
    const unit = (await Select.prompt({
      message: "In the last",
      options: [
        { name: "days", value: "days" },
        { name: "weeks", value: "weeks" },
        { name: "months", value: "months" },
      ],
    })) as TimeUnit;
    const countStr = await Input.prompt({
      message: `How many ${unit}?`,
    });
    const count = parseInt(countStr, 10);
    const rhythm = await createTrailingRhythm(db, { count, unit });
    rhythmId = rhythm.id;
    rhythmDescription = `in the last ${count} ${unit}`;
  } else {
    const unit = (await Select.prompt({
      message: "Every",
      options: [
        { name: "days", value: "days" },
        { name: "weeks", value: "weeks" },
        { name: "months", value: "months" },
      ],
    })) as TimeUnit;
    const everyStr = await Input.prompt({
      message: `Every how many ${unit}?`,
    });
    const every = parseInt(everyStr, 10);
    const rhythm = await createRecurringRhythm(db, { every, unit });
    rhythmId = rhythm.id;
    rhythmDescription = `every ${every} ${unit}`;
  }

  const targetPrompt = measurement === "duration" ? "How many minutes?" : "How many times?";
  const targetStr = await Input.prompt({
    message: targetPrompt,
  });
  const target = parseInt(targetStr, 10);

  const activity = await createActivity(db, {
    name,
    framing,
    rhythmId,
    target,
    measurement,
  });

  const unit = measurement === "duration" ? "minutes" : "times";
  console.log(`\nCreated "${activity.name}" - ${target} ${unit} ${rhythmDescription}`);
}
