/**
 * Tests for activities library
 *
 * BDD style tests for unified activity model with framing, rhythm, target, and measurement.
 */

import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { beforeEach, describe, it } from "@std/testing/bdd";
import type { Database } from "../db/connection.ts";
import { createTestDatabase } from "../db/test-utils.ts";
import { Framing, Measurement } from "../types.ts";
import {
  createActivity,
  deleteActivity,
  getActivity,
  listActivities,
  searchActivities,
  updateActivity,
} from "./activities.ts";
import { createCalendarRhythm } from "./rhythms.ts";

describe("activities", () => {
  let db: Database;
  let rhythmId: number;

  beforeEach(async () => {
    db = await createTestDatabase();
    // Create a rhythm to use for all activities
    const rhythm = await createCalendarRhythm(db, { period: "weekly" });
    rhythmId = rhythm.id;
  });

  describe("createActivity", () => {
    it("should create an activity with all fields", async () => {
      const activity = await createActivity(db, {
        name: "Water plants",
        framing: Framing.task,
        rhythmId,
        target: 1,
        measurement: Measurement.instances,
      });

      assertExists(activity.id);
      assertEquals(activity.name, "Water plants");
      assertEquals(activity.framing, "task");
      assertEquals(activity.rhythmId, rhythmId);
      assertEquals(activity.target, 1);
      assertEquals(activity.measurement, "instances");
      assertExists(activity.createdAt);
    });

    it("should enforce task requires instances constraint", async () => {
      await assertRejects(
        async () => {
          await createActivity(db, {
            name: "Invalid task",
            framing: Framing.task,
            rhythmId,
            target: 60,
            measurement: Measurement.duration,
          });
        },
        Error,
        "Tasks must use instances measurement",
      );
    });

    it("should allow pursuit with instances measurement", async () => {
      const activity = await createActivity(db, {
        name: "Meditation sessions",
        framing: Framing.pursuit,
        rhythmId,
        target: 5,
        measurement: Measurement.instances,
      });

      assertEquals(activity.framing, "pursuit");
      assertEquals(activity.measurement, "instances");
      assertEquals(activity.target, 5);
    });

    it("should allow pursuit with duration measurement", async () => {
      const activity = await createActivity(db, {
        name: "Reading",
        framing: Framing.pursuit,
        rhythmId,
        target: 120,
        measurement: Measurement.duration,
      });

      assertEquals(activity.framing, "pursuit");
      assertEquals(activity.measurement, "duration");
      assertEquals(activity.target, 120);
    });
  });

  describe("getActivity", () => {
    it("should return activity by id", async () => {
      const created = await createActivity(db, {
        name: "Test activity",
        framing: Framing.task,
        rhythmId,
        target: 1,
        measurement: Measurement.instances,
      });

      const retrieved = await getActivity(db, created.id);

      assertExists(retrieved);
      assertEquals(retrieved.id, created.id);
      assertEquals(retrieved.name, "Test activity");
    });

    it("should return undefined for non-existent id", async () => {
      const result = await getActivity(db, 99999);

      assertEquals(result, undefined);
    });
  });

  describe("listActivities", () => {
    it("should return all activities", async () => {
      await createActivity(db, {
        name: "Task 1",
        framing: Framing.task,
        rhythmId,
        target: 1,
        measurement: Measurement.instances,
      });
      await createActivity(db, {
        name: "Task 2",
        framing: Framing.task,
        rhythmId,
        target: 1,
        measurement: Measurement.instances,
      });
      await createActivity(db, {
        name: "Pursuit 1",
        framing: Framing.pursuit,
        rhythmId,
        target: 30,
        measurement: Measurement.duration,
      });

      const all = await listActivities(db);

      assertEquals(all.length, 3);
    });

    it("should return empty array when no activities exist", async () => {
      const all = await listActivities(db);

      assertEquals(all, []);
    });

    it("should filter by framing=task", async () => {
      await createActivity(db, {
        name: "Task 1",
        framing: Framing.task,
        rhythmId,
        target: 1,
        measurement: Measurement.instances,
      });
      await createActivity(db, {
        name: "Task 2",
        framing: Framing.task,
        rhythmId,
        target: 1,
        measurement: Measurement.instances,
      });
      await createActivity(db, {
        name: "Pursuit 1",
        framing: Framing.pursuit,
        rhythmId,
        target: 30,
        measurement: Measurement.duration,
      });

      const tasks = await listActivities(db, { framing: Framing.task });

      assertEquals(tasks.length, 2);
      assertEquals(
        tasks.every((a) => a.framing === "task"),
        true,
      );
    });

    it("should filter by framing=pursuit", async () => {
      await createActivity(db, {
        name: "Task 1",
        framing: Framing.task,
        rhythmId,
        target: 1,
        measurement: Measurement.instances,
      });
      await createActivity(db, {
        name: "Pursuit 1",
        framing: Framing.pursuit,
        rhythmId,
        target: 5,
        measurement: Measurement.instances,
      });
      await createActivity(db, {
        name: "Pursuit 2",
        framing: Framing.pursuit,
        rhythmId,
        target: 60,
        measurement: Measurement.duration,
      });

      const pursuits = await listActivities(db, { framing: Framing.pursuit });

      assertEquals(pursuits.length, 2);
      assertEquals(
        pursuits.every((a) => a.framing === "pursuit"),
        true,
      );
    });
  });

  describe("searchActivities", () => {
    it("should find activities by partial name match (case-insensitive)", async () => {
      await createActivity(db, {
        name: "Water plants",
        framing: Framing.task,
        rhythmId,
        target: 1,
        measurement: Measurement.instances,
      });
      await createActivity(db, {
        name: "Clean kitchen",
        framing: Framing.task,
        rhythmId,
        target: 1,
        measurement: Measurement.instances,
      });
      await createActivity(db, {
        name: "Play piano",
        framing: Framing.pursuit,
        rhythmId,
        target: 30,
        measurement: Measurement.duration,
      });

      const results = await searchActivities(db, "pla");

      assertEquals(results.length, 2);
      assertEquals(
        results.some((a) => a.name === "Water plants"),
        true,
      );
      assertEquals(
        results.some((a) => a.name === "Play piano"),
        true,
      );
    });

    it("should be case-insensitive", async () => {
      await createActivity(db, {
        name: "Water PLANTS",
        framing: Framing.task,
        rhythmId,
        target: 1,
        measurement: Measurement.instances,
      });

      const results = await searchActivities(db, "plants");

      assertEquals(results.length, 1);
      assertEquals(results[0].name, "Water PLANTS");
    });

    it("should return empty array for no matches", async () => {
      await createActivity(db, {
        name: "Water plants",
        framing: Framing.task,
        rhythmId,
        target: 1,
        measurement: Measurement.instances,
      });

      const results = await searchActivities(db, "xyz");

      assertEquals(results, []);
    });
  });

  describe("updateActivity", () => {
    it("should update activity fields", async () => {
      const activity = await createActivity(db, {
        name: "Old name",
        framing: Framing.task,
        rhythmId,
        target: 1,
        measurement: Measurement.instances,
      });

      const updated = await updateActivity(db, activity.id, {
        name: "New name",
        target: 2,
      });

      assertExists(updated);
      assertEquals(updated.name, "New name");
      assertEquals(updated.target, 2);
      assertEquals(updated.framing, "task"); // unchanged
    });

    it("should return undefined for non-existent id", async () => {
      const result = await updateActivity(db, 99999, { name: "Test" });

      assertEquals(result, undefined);
    });

    it("should persist changes in database", async () => {
      const activity = await createActivity(db, {
        name: "Original",
        framing: Framing.task,
        rhythmId,
        target: 1,
        measurement: Measurement.instances,
      });
      await updateActivity(db, activity.id, { name: "Changed" });

      const retrieved = await getActivity(db, activity.id);

      assertExists(retrieved);
      assertEquals(retrieved.name, "Changed");
    });
  });

  describe("deleteActivity", () => {
    it("should delete an existing activity and return true", async () => {
      const activity = await createActivity(db, {
        name: "To delete",
        framing: Framing.task,
        rhythmId,
        target: 1,
        measurement: Measurement.instances,
      });

      const result = await deleteActivity(db, activity.id);

      assertEquals(result, true);
    });

    it("should remove activity from database", async () => {
      const activity = await createActivity(db, {
        name: "To delete",
        framing: Framing.task,
        rhythmId,
        target: 1,
        measurement: Measurement.instances,
      });
      await deleteActivity(db, activity.id);

      const retrieved = await getActivity(db, activity.id);

      assertEquals(retrieved, undefined);
    });

    it("should return false for non-existent id", async () => {
      const result = await deleteActivity(db, 99999);

      assertEquals(result, false);
    });
  });
});
