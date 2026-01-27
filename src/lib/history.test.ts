/**
 * Tests for history library
 *
 * BDD style tests for the event store that records activity completions and duration logs.
 */

import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { withTestContext } from "../db/test-utils.ts";
import { Framing, Measurement } from "../types.ts";
import { createActivity } from "./activities.ts";
import {
  deleteHistoryEvent,
  getActivityHistory,
  getRecentHistory,
  recordCompletion,
  recordDuration,
} from "./history.ts";

describe("history", () => {
  describe("recordCompletion", () => {
    it("should create completion event with timestamp", async () => {
      await withTestContext(async ({ db, rhythmId }) => {
        const activity = await createActivity(db, {
          name: "Water plants",
          framing: Framing.task,
          rhythmId,
          target: 1,
          measurement: Measurement.instances,
        });
        const timestamp = new Date("2024-01-15T10:00:00Z");

        const event = await recordCompletion(db, {
          activityId: activity.id,
          timestamp,
        });

        assertExists(event.id);
        assertEquals(event.activityId, activity.id);
        assertEquals(event.kind, "completion");
        assertEquals(event.minutes, null);
        assertEquals(event.timestamp.getTime(), timestamp.getTime());
      });
    });

    it("should default to current time when timestamp not provided", async () => {
      await withTestContext(async ({ db, rhythmId }) => {
        const activity = await createActivity(db, {
          name: "Water plants",
          framing: Framing.task,
          rhythmId,
          target: 1,
          measurement: Measurement.instances,
        });
        const before = Date.now();

        const event = await recordCompletion(db, {
          activityId: activity.id,
        });

        const after = Date.now();
        assertExists(event.timestamp);
        // Allow 1 second tolerance for database round-trip
        assertEquals(event.timestamp.getTime() >= before - 1000, true);
        assertEquals(event.timestamp.getTime() <= after + 1000, true);
      });
    });

    it("should fail for non-existent activity", async () => {
      await withTestContext(async ({ db }) => {
        await assertRejects(
          async () => {
            await recordCompletion(db, {
              activityId: 99999,
            });
          },
          Error,
          "Activity not found",
        );
      });
    });

    it("should fail for duration-measurement activity", async () => {
      await withTestContext(async ({ db, rhythmId }) => {
        const activity = await createActivity(db, {
          name: "Reading",
          framing: Framing.pursuit,
          rhythmId,
          target: 120,
          measurement: Measurement.duration,
        });

        await assertRejects(
          async () => {
            await recordCompletion(db, {
              activityId: activity.id,
            });
          },
          Error,
          "Cannot record completion for duration-measurement activity",
        );
      });
    });
  });

  describe("recordDuration", () => {
    it("should create duration event with minutes", async () => {
      await withTestContext(async ({ db, rhythmId }) => {
        const activity = await createActivity(db, {
          name: "Reading",
          framing: Framing.pursuit,
          rhythmId,
          target: 120,
          measurement: Measurement.duration,
        });
        const timestamp = new Date("2024-01-15T10:00:00Z");

        const event = await recordDuration(db, {
          activityId: activity.id,
          minutes: 30,
          timestamp,
        });

        assertExists(event.id);
        assertEquals(event.activityId, activity.id);
        assertEquals(event.kind, "duration");
        assertEquals(event.minutes, 30);
        assertEquals(event.timestamp.getTime(), timestamp.getTime());
      });
    });

    it("should default to current time when timestamp not provided", async () => {
      await withTestContext(async ({ db, rhythmId }) => {
        const activity = await createActivity(db, {
          name: "Reading",
          framing: Framing.pursuit,
          rhythmId,
          target: 120,
          measurement: Measurement.duration,
        });
        const before = Date.now();

        const event = await recordDuration(db, {
          activityId: activity.id,
          minutes: 45,
        });

        const after = Date.now();
        assertExists(event.timestamp);
        // Allow 1 second tolerance for database round-trip
        assertEquals(event.timestamp.getTime() >= before - 1000, true);
        assertEquals(event.timestamp.getTime() <= after + 1000, true);
      });
    });

    it("should fail for non-existent activity", async () => {
      await withTestContext(async ({ db }) => {
        await assertRejects(
          async () => {
            await recordDuration(db, {
              activityId: 99999,
              minutes: 30,
            });
          },
          Error,
          "Activity not found",
        );
      });
    });

    it("should fail for instances-measurement activity", async () => {
      await withTestContext(async ({ db, rhythmId }) => {
        const activity = await createActivity(db, {
          name: "Water plants",
          framing: Framing.task,
          rhythmId,
          target: 1,
          measurement: Measurement.instances,
        });

        await assertRejects(
          async () => {
            await recordDuration(db, {
              activityId: activity.id,
              minutes: 30,
            });
          },
          Error,
          "Cannot record duration for instances-measurement activity",
        );
      });
    });
  });

  describe("getActivityHistory", () => {
    it("should return events for activity", async () => {
      await withTestContext(async ({ db, rhythmId }) => {
        const activity = await createActivity(db, {
          name: "Water plants",
          framing: Framing.task,
          rhythmId,
          target: 3,
          measurement: Measurement.instances,
        });
        await recordCompletion(db, { activityId: activity.id });
        await recordCompletion(db, { activityId: activity.id });
        await recordCompletion(db, { activityId: activity.id });

        const events = await getActivityHistory(db, activity.id);

        assertEquals(events.length, 3);
        assertEquals(
          events.every((e) => e.activityId === activity.id),
          true,
        );
      });
    });

    it("should return in descending order by timestamp", async () => {
      await withTestContext(async ({ db, rhythmId }) => {
        const activity = await createActivity(db, {
          name: "Water plants",
          framing: Framing.task,
          rhythmId,
          target: 3,
          measurement: Measurement.instances,
        });
        const t1 = new Date("2024-01-01T10:00:00Z");
        const t2 = new Date("2024-01-02T10:00:00Z");
        const t3 = new Date("2024-01-03T10:00:00Z");

        // Insert in random order
        await recordCompletion(db, { activityId: activity.id, timestamp: t2 });
        await recordCompletion(db, { activityId: activity.id, timestamp: t1 });
        await recordCompletion(db, { activityId: activity.id, timestamp: t3 });

        const events = await getActivityHistory(db, activity.id);

        assertEquals(events.length, 3);
        assertEquals(events[0].timestamp.getTime(), t3.getTime());
        assertEquals(events[1].timestamp.getTime(), t2.getTime());
        assertEquals(events[2].timestamp.getTime(), t1.getTime());
      });
    });

    it("should respect date range filters", async () => {
      await withTestContext(async ({ db, rhythmId }) => {
        const activity = await createActivity(db, {
          name: "Water plants",
          framing: Framing.task,
          rhythmId,
          target: 5,
          measurement: Measurement.instances,
        });
        await recordCompletion(db, {
          activityId: activity.id,
          timestamp: new Date("2024-01-01T10:00:00Z"),
        });
        await recordCompletion(db, {
          activityId: activity.id,
          timestamp: new Date("2024-01-05T10:00:00Z"),
        });
        await recordCompletion(db, {
          activityId: activity.id,
          timestamp: new Date("2024-01-10T10:00:00Z"),
        });
        await recordCompletion(db, {
          activityId: activity.id,
          timestamp: new Date("2024-01-15T10:00:00Z"),
        });
        await recordCompletion(db, {
          activityId: activity.id,
          timestamp: new Date("2024-01-20T10:00:00Z"),
        });

        const events = await getActivityHistory(db, activity.id, {
          from: new Date("2024-01-05T00:00:00Z"),
          to: new Date("2024-01-15T23:59:59Z"),
        });

        assertEquals(events.length, 3);
      });
    });

    it("should respect limit", async () => {
      await withTestContext(async ({ db, rhythmId }) => {
        const activity = await createActivity(db, {
          name: "Water plants",
          framing: Framing.task,
          rhythmId,
          target: 10,
          measurement: Measurement.instances,
        });
        for (let i = 0; i < 10; i++) {
          await recordCompletion(db, { activityId: activity.id });
        }

        const events = await getActivityHistory(db, activity.id, { limit: 3 });

        assertEquals(events.length, 3);
      });
    });

    it("should return empty array for activity with no events", async () => {
      await withTestContext(async ({ db, rhythmId }) => {
        const activity = await createActivity(db, {
          name: "Water plants",
          framing: Framing.task,
          rhythmId,
          target: 1,
          measurement: Measurement.instances,
        });

        const events = await getActivityHistory(db, activity.id);

        assertEquals(events, []);
      });
    });

    it("should not return events from other activities", async () => {
      await withTestContext(async ({ db, rhythmId }) => {
        const activity1 = await createActivity(db, {
          name: "Activity 1",
          framing: Framing.task,
          rhythmId,
          target: 1,
          measurement: Measurement.instances,
        });
        const activity2 = await createActivity(db, {
          name: "Activity 2",
          framing: Framing.task,
          rhythmId,
          target: 1,
          measurement: Measurement.instances,
        });
        await recordCompletion(db, { activityId: activity1.id });
        await recordCompletion(db, { activityId: activity2.id });
        await recordCompletion(db, { activityId: activity2.id });

        const events = await getActivityHistory(db, activity1.id);

        assertEquals(events.length, 1);
        assertEquals(events[0].activityId, activity1.id);
      });
    });
  });

  describe("getRecentHistory", () => {
    it("should return recent events across all activities", async () => {
      await withTestContext(async ({ db, rhythmId }) => {
        const activity1 = await createActivity(db, {
          name: "Activity 1",
          framing: Framing.task,
          rhythmId,
          target: 1,
          measurement: Measurement.instances,
        });
        const activity2 = await createActivity(db, {
          name: "Activity 2",
          framing: Framing.pursuit,
          rhythmId,
          target: 60,
          measurement: Measurement.duration,
        });
        await recordCompletion(db, { activityId: activity1.id });
        await recordDuration(db, { activityId: activity2.id, minutes: 30 });
        await recordCompletion(db, { activityId: activity1.id });

        const events = await getRecentHistory(db);

        assertEquals(events.length, 3);
      });
    });

    it("should return events in descending order by timestamp", async () => {
      await withTestContext(async ({ db, rhythmId }) => {
        const activity = await createActivity(db, {
          name: "Activity",
          framing: Framing.task,
          rhythmId,
          target: 3,
          measurement: Measurement.instances,
        });
        const t1 = new Date("2024-01-01T10:00:00Z");
        const t2 = new Date("2024-01-02T10:00:00Z");
        const t3 = new Date("2024-01-03T10:00:00Z");

        await recordCompletion(db, { activityId: activity.id, timestamp: t2 });
        await recordCompletion(db, { activityId: activity.id, timestamp: t1 });
        await recordCompletion(db, { activityId: activity.id, timestamp: t3 });

        const events = await getRecentHistory(db);

        assertEquals(events[0].timestamp.getTime(), t3.getTime());
        assertEquals(events[1].timestamp.getTime(), t2.getTime());
        assertEquals(events[2].timestamp.getTime(), t1.getTime());
      });
    });

    it("should respect limit parameter", async () => {
      await withTestContext(async ({ db, rhythmId }) => {
        const activity = await createActivity(db, {
          name: "Activity",
          framing: Framing.task,
          rhythmId,
          target: 10,
          measurement: Measurement.instances,
        });
        for (let i = 0; i < 10; i++) {
          await recordCompletion(db, { activityId: activity.id });
        }

        const events = await getRecentHistory(db, 5);

        assertEquals(events.length, 5);
      });
    });

    it("should return empty array when no events exist", async () => {
      await withTestContext(async ({ db }) => {
        const events = await getRecentHistory(db);

        assertEquals(events, []);
      });
    });
  });

  describe("deleteHistoryEvent", () => {
    it("should remove event and return true", async () => {
      await withTestContext(async ({ db, rhythmId }) => {
        const activity = await createActivity(db, {
          name: "Activity",
          framing: Framing.task,
          rhythmId,
          target: 1,
          measurement: Measurement.instances,
        });
        const event = await recordCompletion(db, { activityId: activity.id });

        const result = await deleteHistoryEvent(db, event.id);

        assertEquals(result, true);
      });
    });

    it("should actually remove event from database", async () => {
      await withTestContext(async ({ db, rhythmId }) => {
        const activity = await createActivity(db, {
          name: "Activity",
          framing: Framing.task,
          rhythmId,
          target: 2,
          measurement: Measurement.instances,
        });
        const event1 = await recordCompletion(db, { activityId: activity.id });
        await recordCompletion(db, { activityId: activity.id });

        await deleteHistoryEvent(db, event1.id);

        const events = await getActivityHistory(db, activity.id);
        assertEquals(events.length, 1);
        assertEquals(
          events.some((e) => e.id === event1.id),
          false,
        );
      });
    });

    it("should return false for non-existent event", async () => {
      await withTestContext(async ({ db }) => {
        const result = await deleteHistoryEvent(db, 99999);

        assertEquals(result, false);
      });
    });
  });
});
