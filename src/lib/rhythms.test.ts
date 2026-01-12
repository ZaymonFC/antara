/**
 * Tests for rhythm CRUD operations
 */

import { assertEquals, assertExists } from "@std/assert";
import { beforeEach, describe, it } from "@std/testing/bdd";
import type { Database } from "../db/connection.ts";
import { createTestDatabase } from "../db/test-utils.ts";
import {
  createCalendarRhythm,
  createRecurringRhythm,
  createTrailingRhythm,
  deleteRhythm,
  getRhythm,
} from "./rhythms.ts";

describe("rhythms", () => {
  let db: Database;

  beforeEach(async () => {
    db = await createTestDatabase();
  });

  describe("createTrailingRhythm", () => {
    it("should create a trailing rhythm with count and unit", async () => {
      const rhythm = await createTrailingRhythm(db, { count: 7, unit: "days" });

      assertExists(rhythm.id);
      assertEquals(rhythm.kind, "trailing");
      assertEquals(rhythm.trailingCount, 7);
      assertEquals(rhythm.trailingUnit, "days");
      assertEquals(rhythm.recurringEvery, null);
      assertEquals(rhythm.calendarPeriod, null);
    });

    it("should support weeks and months units", async () => {
      const weeks = await createTrailingRhythm(db, { count: 2, unit: "weeks" });
      const months = await createTrailingRhythm(db, { count: 3, unit: "months" });

      assertEquals(weeks.trailingUnit, "weeks");
      assertEquals(months.trailingUnit, "months");
    });
  });

  describe("createRecurringRhythm", () => {
    it("should create a recurring rhythm with every and unit", async () => {
      const rhythm = await createRecurringRhythm(db, { every: 5, unit: "days" });

      assertExists(rhythm.id);
      assertEquals(rhythm.kind, "recurring");
      assertEquals(rhythm.recurringEvery, 5);
      assertEquals(rhythm.recurringUnit, "days");
      assertEquals(rhythm.trailingCount, null);
      assertEquals(rhythm.calendarPeriod, null);
    });

    it("should support weeks and months units", async () => {
      const weeks = await createRecurringRhythm(db, { every: 2, unit: "weeks" });
      const months = await createRecurringRhythm(db, { every: 1, unit: "months" });

      assertEquals(weeks.recurringUnit, "weeks");
      assertEquals(months.recurringUnit, "months");
    });
  });

  describe("createCalendarRhythm", () => {
    it("should create a calendar rhythm with period", async () => {
      const rhythm = await createCalendarRhythm(db, { period: "weekly" });

      assertExists(rhythm.id);
      assertEquals(rhythm.kind, "calendar");
      assertEquals(rhythm.calendarPeriod, "weekly");
      assertEquals(rhythm.trailingCount, null);
      assertEquals(rhythm.recurringEvery, null);
    });

    it("should support all calendar periods", async () => {
      const daily = await createCalendarRhythm(db, { period: "daily" });
      const weekly = await createCalendarRhythm(db, { period: "weekly" });
      const monthly = await createCalendarRhythm(db, { period: "monthly" });
      const yearly = await createCalendarRhythm(db, { period: "yearly" });

      assertEquals(daily.calendarPeriod, "daily");
      assertEquals(weekly.calendarPeriod, "weekly");
      assertEquals(monthly.calendarPeriod, "monthly");
      assertEquals(yearly.calendarPeriod, "yearly");
    });
  });

  describe("getRhythm", () => {
    it("should return TrailingRhythm for trailing kind", async () => {
      const created = await createTrailingRhythm(db, { count: 7, unit: "days" });
      const rhythm = await getRhythm(db, created.id);

      assertExists(rhythm);
      assertEquals(rhythm.kind, "trailing");
      if (rhythm.kind === "trailing") {
        assertEquals(rhythm.count, 7);
        assertEquals(rhythm.unit, "days");
      }
    });

    it("should return RecurringRhythm for recurring kind", async () => {
      const created = await createRecurringRhythm(db, { every: 30, unit: "days" });
      const rhythm = await getRhythm(db, created.id);

      assertExists(rhythm);
      assertEquals(rhythm.kind, "recurring");
      if (rhythm.kind === "recurring") {
        assertEquals(rhythm.every, 30);
        assertEquals(rhythm.unit, "days");
      }
    });

    it("should return CalendarRhythm for calendar kind", async () => {
      const created = await createCalendarRhythm(db, { period: "monthly" });
      const rhythm = await getRhythm(db, created.id);

      assertExists(rhythm);
      assertEquals(rhythm.kind, "calendar");
      if (rhythm.kind === "calendar") {
        assertEquals(rhythm.period, "monthly");
      }
    });

    it("should return undefined for non-existent id", async () => {
      const rhythm = await getRhythm(db, 9999);
      assertEquals(rhythm, undefined);
    });
  });

  describe("deleteRhythm", () => {
    it("should delete rhythm and return true", async () => {
      const rhythm = await createTrailingRhythm(db, { count: 7, unit: "days" });
      const deleted = await deleteRhythm(db, rhythm.id);

      assertEquals(deleted, true);

      const found = await getRhythm(db, rhythm.id);
      assertEquals(found, undefined);
    });

    it("should return false for non-existent id", async () => {
      const deleted = await deleteRhythm(db, 9999);
      assertEquals(deleted, false);
    });
  });
});
