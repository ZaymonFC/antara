/**
 * Tests for errands library
 *
 * BDD style tests for one-off errands with 3-day visibility window.
 */

import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { beforeEach, describe, it } from "@std/testing/bdd";
import type { Database } from "../db/connection.ts";
import { createTestDatabase } from "../db/test-utils.ts";
import {
  completeErrand,
  createErrand,
  deleteErrand,
  getErrand,
  listErrands,
  listPendingErrands,
} from "./errands.ts";

describe("errands", () => {
  let db: Database;

  beforeEach(async () => {
    db = await createTestDatabase();
  });

  describe("createErrand", () => {
    it("should create an errand with name and timestamps", async () => {
      const errand = await createErrand(db, { name: "Buy milk" });

      assertExists(errand.id);
      assertEquals(errand.name, "Buy milk");
      assertExists(errand.createdAt);
      assertEquals(errand.completedAt, null);
    });
  });

  describe("getErrand", () => {
    it("should return errand by id", async () => {
      const created = await createErrand(db, { name: "Test errand" });

      const retrieved = await getErrand(db, created.id);

      assertExists(retrieved);
      assertEquals(retrieved.id, created.id);
      assertEquals(retrieved.name, "Test errand");
    });

    it("should return undefined for non-existent id", async () => {
      const result = await getErrand(db, 99999);

      assertEquals(result, undefined);
    });
  });

  describe("listErrands", () => {
    it("should return all pending errands", async () => {
      await createErrand(db, { name: "Errand 1" });
      await createErrand(db, { name: "Errand 2" });
      await createErrand(db, { name: "Errand 3" });

      const all = await listErrands(db);

      assertEquals(all.length, 3);
    });

    it("should return empty array when no errands exist", async () => {
      const all = await listErrands(db);

      assertEquals(all, []);
    });

    it("should include completed errands within 3 days", async () => {
      const pendingErrand = await createErrand(db, { name: "Pending" });
      const completedErrand = await createErrand(db, { name: "Recently completed" });

      // Complete errand 1 day ago
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
      await completeErrand(db, completedErrand.id, oneDayAgo);

      const visible = await listErrands(db, { now });

      assertEquals(visible.length, 2);
      assertEquals(
        visible.some((e) => e.id === pendingErrand.id),
        true,
      );
      assertEquals(
        visible.some((e) => e.id === completedErrand.id),
        true,
      );
    });

    it("should hide completed errands older than 3 days", async () => {
      const pendingErrand = await createErrand(db, { name: "Pending" });
      const oldErrand = await createErrand(db, { name: "Old completed" });

      // Complete oldErrand 4 days ago
      const now = new Date();
      const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
      await completeErrand(db, oldErrand.id, fourDaysAgo);

      const visible = await listErrands(db, { now });

      assertEquals(visible.length, 1);
      assertEquals(visible[0].id, pendingErrand.id);
    });

    it("should include expired errands when includeExpired is true", async () => {
      await createErrand(db, { name: "Pending" });
      const oldErrand = await createErrand(db, { name: "Old completed" });

      // Complete oldErrand 10 days ago
      const now = new Date();
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      await completeErrand(db, oldErrand.id, tenDaysAgo);

      const all = await listErrands(db, { includeExpired: true });

      assertEquals(all.length, 2);
    });

    it("should handle edge case of exactly 3 days", async () => {
      const errand = await createErrand(db, { name: "Edge case" });

      // Complete exactly 3 days ago (should still be visible)
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      await completeErrand(db, errand.id, threeDaysAgo);

      // At exactly 3 days, using > comparison means it's hidden
      const visible = await listErrands(db, { now });

      assertEquals(visible.length, 0);
    });

    it("should handle edge case of just under 3 days", async () => {
      const errand = await createErrand(db, { name: "Edge case" });

      // Complete just under 3 days ago (should be visible)
      const now = new Date();
      const justUnderThreeDays = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000 - 1000));
      await completeErrand(db, errand.id, justUnderThreeDays);

      const visible = await listErrands(db, { now });

      assertEquals(visible.length, 1);
    });
  });

  describe("listPendingErrands", () => {
    it("should return only pending errands", async () => {
      const errand1 = await createErrand(db, { name: "Pending 1" });
      const errand2 = await createErrand(db, { name: "Completed" });
      const errand3 = await createErrand(db, { name: "Pending 2" });

      await completeErrand(db, errand2.id);

      const pending = await listPendingErrands(db);

      assertEquals(pending.length, 2);
      assertEquals(
        pending.some((e) => e.id === errand1.id),
        true,
      );
      assertEquals(
        pending.some((e) => e.id === errand3.id),
        true,
      );
      assertEquals(
        pending.some((e) => e.id === errand2.id),
        false,
      );
    });
  });

  describe("completeErrand", () => {
    it("should mark errand as complete with timestamp", async () => {
      const errand = await createErrand(db, { name: "To complete" });

      const completed = await completeErrand(db, errand.id);

      assertExists(completed.completedAt);
      assertEquals(completed.name, "To complete");
    });

    it("should use custom timestamp when provided", async () => {
      const errand = await createErrand(db, { name: "To complete" });
      const customTime = new Date("2024-06-15T12:00:00Z");

      const completed = await completeErrand(db, errand.id, customTime);

      assertEquals(completed.completedAt?.getTime(), customTime.getTime());
    });

    it("should throw error for non-existent errand", async () => {
      await assertRejects(
        async () => {
          await completeErrand(db, 99999);
        },
        Error,
        "Errand with id 99999 not found",
      );
    });

    it("should throw error for already completed errand", async () => {
      const errand = await createErrand(db, { name: "Already done" });
      await completeErrand(db, errand.id);

      await assertRejects(
        async () => {
          await completeErrand(db, errand.id);
        },
        Error,
        'Errand "Already done" is already completed',
      );
    });

    it("should persist completion in database", async () => {
      const errand = await createErrand(db, { name: "Persist test" });
      await completeErrand(db, errand.id);

      const retrieved = await getErrand(db, errand.id);

      assertExists(retrieved);
      assertExists(retrieved.completedAt);
    });
  });

  describe("deleteErrand", () => {
    it("should delete an existing errand and return true", async () => {
      const errand = await createErrand(db, { name: "To delete" });

      const result = await deleteErrand(db, errand.id);

      assertEquals(result, true);
    });

    it("should remove errand from database", async () => {
      const errand = await createErrand(db, { name: "To delete" });
      await deleteErrand(db, errand.id);

      const retrieved = await getErrand(db, errand.id);

      assertEquals(retrieved, undefined);
    });

    it("should return false for non-existent id", async () => {
      const result = await deleteErrand(db, 99999);

      assertEquals(result, false);
    });
  });
});
