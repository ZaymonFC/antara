/**
 * Tests for progress calculation
 *
 * Tests the pure progress calculation functions without database access.
 */

import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import type { Activity, HistoryEvent } from "../db/schema.ts";
import { getProgress } from "./progress.ts";

// Helper to create mock activity
function mockActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 1,
    name: "Test Activity",
    framing: "pursuit",
    rhythmId: 1,
    target: 3,
    measurement: "instances",
    createdAt: new Date(),
    ...overrides,
  };
}

// Helper to create mock history event
function mockEvent(timestamp: Date, minutes?: number): HistoryEvent {
  return {
    id: 1,
    activityId: 1,
    kind: minutes ? "duration" : "completion",
    minutes: minutes ?? null,
    timestamp,
  };
}

describe("progress", () => {
  describe("recurring rhythm", () => {
    const rhythm = { kind: "recurring" as const, every: 7, unit: "days" as const };

    it("should be on track when completed within interval", () => {
      const now = new Date("2024-01-10T12:00:00Z");
      const activity = mockActivity({ target: 1 });
      const history = [mockEvent(new Date("2024-01-08T12:00:00Z"))]; // 2 days ago

      const progress = getProgress(activity, rhythm, history, now);

      assertEquals(progress.isOnTrack, true);
      assertEquals(progress.context, "2 days ago");
    });

    it("should be on track when completed today", () => {
      const now = new Date("2024-01-10T12:00:00Z");
      const activity = mockActivity({ target: 1 });
      const history = [mockEvent(new Date("2024-01-10T08:00:00Z"))]; // earlier today

      const progress = getProgress(activity, rhythm, history, now);

      assertEquals(progress.isOnTrack, true);
      assertEquals(progress.context, "today");
    });

    it("should be overdue when not completed within interval", () => {
      const now = new Date("2024-01-20T12:00:00Z");
      const activity = mockActivity({ target: 1 });
      const history = [mockEvent(new Date("2024-01-10T12:00:00Z"))]; // 10 days ago

      const progress = getProgress(activity, rhythm, history, now);

      assertEquals(progress.isOnTrack, false);
      assertEquals(progress.context, "3 days overdue"); // 10 - 7 = 3 days overdue
    });

    it("should be overdue when never done", () => {
      const now = new Date("2024-01-10T12:00:00Z");
      const activity = mockActivity({ target: 1 });

      const progress = getProgress(activity, rhythm, [], now);

      assertEquals(progress.isOnTrack, false);
      assertEquals(progress.context, "Not started yet");
    });

    it("should use most recent event", () => {
      const now = new Date("2024-01-10T12:00:00Z");
      const activity = mockActivity({ target: 1 });
      const history = [
        mockEvent(new Date("2024-01-01T12:00:00Z")), // old
        mockEvent(new Date("2024-01-09T12:00:00Z")), // recent - 1 day ago
        mockEvent(new Date("2024-01-05T12:00:00Z")), // middle
      ];

      const progress = getProgress(activity, rhythm, history, now);

      assertEquals(progress.isOnTrack, true);
      assertEquals(progress.context, "1 day ago");
    });
  });

  describe("trailing rhythm", () => {
    const rhythm = { kind: "trailing" as const, count: 7, unit: "days" as const };

    it("should be on track when count meets target", () => {
      const now = new Date("2024-01-10T12:00:00Z");
      const activity = mockActivity({ target: 3, measurement: "instances" });
      const history = [
        mockEvent(new Date("2024-01-09T12:00:00Z")),
        mockEvent(new Date("2024-01-08T12:00:00Z")),
        mockEvent(new Date("2024-01-07T12:00:00Z")),
      ];

      const progress = getProgress(activity, rhythm, history, now);

      assertEquals(progress.isOnTrack, true);
      assertEquals(progress.current, 3);
      assertEquals(progress.target, 3);
    });

    it("should be on track when count exceeds target", () => {
      const now = new Date("2024-01-10T12:00:00Z");
      const activity = mockActivity({ target: 3, measurement: "instances" });
      const history = [
        mockEvent(new Date("2024-01-09T12:00:00Z")),
        mockEvent(new Date("2024-01-08T12:00:00Z")),
        mockEvent(new Date("2024-01-07T12:00:00Z")),
        mockEvent(new Date("2024-01-06T12:00:00Z")),
        mockEvent(new Date("2024-01-05T12:00:00Z")),
      ];

      const progress = getProgress(activity, rhythm, history, now);

      assertEquals(progress.isOnTrack, true);
      assertEquals(progress.current, 5);
    });

    it("should not be on track when count below target", () => {
      const now = new Date("2024-01-10T12:00:00Z");
      const activity = mockActivity({ target: 5, measurement: "instances" });
      const history = [
        mockEvent(new Date("2024-01-09T12:00:00Z")),
        mockEvent(new Date("2024-01-08T12:00:00Z")),
      ];

      const progress = getProgress(activity, rhythm, history, now);

      assertEquals(progress.isOnTrack, false);
      assertEquals(progress.current, 2);
      assertEquals(progress.target, 5);
    });

    it("should exclude events outside window", () => {
      const now = new Date("2024-01-10T12:00:00Z");
      const activity = mockActivity({ target: 3, measurement: "instances" });
      const history = [
        mockEvent(new Date("2024-01-09T12:00:00Z")), // in window
        mockEvent(new Date("2024-01-08T12:00:00Z")), // in window
        mockEvent(new Date("2024-01-01T12:00:00Z")), // outside window (9 days ago)
        mockEvent(new Date("2023-12-20T12:00:00Z")), // outside window
      ];

      const progress = getProgress(activity, rhythm, history, now);

      assertEquals(progress.current, 2);
      assertEquals(progress.isOnTrack, false);
    });

    it("should aggregate duration for duration measurement", () => {
      const now = new Date("2024-01-10T12:00:00Z");
      const activity = mockActivity({ target: 150, measurement: "duration" });
      const history = [
        mockEvent(new Date("2024-01-09T12:00:00Z"), 60),
        mockEvent(new Date("2024-01-08T12:00:00Z"), 45),
        mockEvent(new Date("2024-01-07T12:00:00Z"), 30),
      ];

      const progress = getProgress(activity, rhythm, history, now);

      assertEquals(progress.current, 135);
      assertEquals(progress.target, 150);
      assertEquals(progress.isOnTrack, false);
    });

    it("should show context with window description", () => {
      const now = new Date("2024-01-10T12:00:00Z");
      const activity = mockActivity({ target: 3 });

      const progress = getProgress(activity, rhythm, [], now);

      assertEquals(progress.context, "last 7 days");
    });
  });

  describe("calendar rhythm", () => {
    describe("weekly period", () => {
      const rhythm = { kind: "calendar" as const, period: "weekly" as const };

      it("should count events in current week", () => {
        // Wednesday Jan 10, 2024 - week started Monday Jan 8
        const now = new Date("2024-01-10T12:00:00Z");
        const activity = mockActivity({ target: 3, measurement: "instances" });
        const history = [
          mockEvent(new Date("2024-01-10T08:00:00Z")), // this week
          mockEvent(new Date("2024-01-09T08:00:00Z")), // this week
          mockEvent(new Date("2024-01-07T08:00:00Z")), // last week (Sunday)
        ];

        const progress = getProgress(activity, rhythm, history, now);

        assertEquals(progress.current, 2);
        assertEquals(progress.isOnTrack, false);
      });

      it("should be on track when target met", () => {
        const now = new Date("2024-01-10T12:00:00Z");
        const activity = mockActivity({ target: 3, measurement: "instances" });
        const history = [
          mockEvent(new Date("2024-01-10T08:00:00Z")),
          mockEvent(new Date("2024-01-09T08:00:00Z")),
          mockEvent(new Date("2024-01-08T08:00:00Z")), // Monday - start of week
        ];

        const progress = getProgress(activity, rhythm, history, now);

        assertEquals(progress.current, 3);
        assertEquals(progress.isOnTrack, true);
      });

      it("should show context as this week", () => {
        const now = new Date("2024-01-10T12:00:00Z");
        const activity = mockActivity({ target: 3 });

        const progress = getProgress(activity, rhythm, [], now);

        assertEquals(progress.context, "this week");
      });
    });

    describe("monthly period", () => {
      const rhythm = { kind: "calendar" as const, period: "monthly" as const };

      it("should count events in current month", () => {
        const now = new Date("2024-01-15T12:00:00Z");
        const activity = mockActivity({ target: 10, measurement: "instances" });
        const history = [
          mockEvent(new Date("2024-01-10T08:00:00Z")), // this month
          mockEvent(new Date("2024-01-05T08:00:00Z")), // this month
          mockEvent(new Date("2023-12-28T08:00:00Z")), // last month
        ];

        const progress = getProgress(activity, rhythm, history, now);

        assertEquals(progress.current, 2);
        assertEquals(progress.isOnTrack, false);
      });

      it("should show context as this month", () => {
        const now = new Date("2024-01-15T12:00:00Z");
        const activity = mockActivity({ target: 10 });

        const progress = getProgress(activity, rhythm, [], now);

        assertEquals(progress.context, "this month");
      });
    });

    describe("daily period", () => {
      const rhythm = { kind: "calendar" as const, period: "daily" as const };

      it("should count events today only", () => {
        const now = new Date("2024-01-10T18:00:00Z");
        const activity = mockActivity({ target: 2, measurement: "instances" });
        const history = [
          mockEvent(new Date("2024-01-10T08:00:00Z")), // today
          mockEvent(new Date("2024-01-10T12:00:00Z")), // today
          mockEvent(new Date("2024-01-09T20:00:00Z")), // yesterday
        ];

        const progress = getProgress(activity, rhythm, history, now);

        assertEquals(progress.current, 2);
        assertEquals(progress.isOnTrack, true);
      });

      it("should show context as this day", () => {
        const now = new Date("2024-01-10T12:00:00Z");
        const activity = mockActivity({ target: 1 });

        const progress = getProgress(activity, rhythm, [], now);

        assertEquals(progress.context, "this day");
      });
    });

    describe("duration measurement", () => {
      const rhythm = { kind: "calendar" as const, period: "weekly" as const };

      it("should sum minutes for duration activities", () => {
        const now = new Date("2024-01-10T12:00:00Z");
        const activity = mockActivity({ target: 150, measurement: "duration" });
        const history = [
          mockEvent(new Date("2024-01-10T08:00:00Z"), 45),
          mockEvent(new Date("2024-01-09T08:00:00Z"), 60),
          mockEvent(new Date("2024-01-08T08:00:00Z"), 30),
        ];

        const progress = getProgress(activity, rhythm, history, now);

        assertEquals(progress.current, 135);
        assertEquals(progress.target, 150);
        assertEquals(progress.isOnTrack, false);
      });

      it("should be on track when minutes meet target", () => {
        const now = new Date("2024-01-10T12:00:00Z");
        const activity = mockActivity({ target: 150, measurement: "duration" });
        const history = [
          mockEvent(new Date("2024-01-10T08:00:00Z"), 60),
          mockEvent(new Date("2024-01-09T08:00:00Z"), 60),
          mockEvent(new Date("2024-01-08T08:00:00Z"), 45),
        ];

        const progress = getProgress(activity, rhythm, history, now);

        assertEquals(progress.current, 165);
        assertEquals(progress.isOnTrack, true);
      });
    });
  });
});
