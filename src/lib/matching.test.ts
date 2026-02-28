/**
 * Tests for activity name matching
 */

import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { levenshtein, matchActivity } from "./matching.ts";

describe("levenshtein", () => {
  it("should return 0 for identical strings", () => {
    assertEquals(levenshtein("hello", "hello"), 0);
  });

  it("should return 1 for a single edit", () => {
    assertEquals(levenshtein("cat", "bat"), 1);
  });

  it("should return string length when compared to empty", () => {
    assertEquals(levenshtein("", "hello"), 5);
    assertEquals(levenshtein("hello", ""), 5);
  });

  it("should return 3 for kitten/sitting", () => {
    assertEquals(levenshtein("kitten", "sitting"), 3);
  });
});

describe("matchActivity", () => {
  const names = ["Meditation", "Running", "Reading", "Writing"];

  it("should exact match case-insensitively", () => {
    assertEquals(matchActivity("meditation", names), {
      kind: "exact",
      name: "Meditation",
    });
  });

  it("should exact match with different casing", () => {
    assertEquals(matchActivity("RUNNING", names), {
      kind: "exact",
      name: "Running",
    });
  });

  it("should return suggestions for a typo", () => {
    const result = matchActivity("readng", names);
    assertEquals(result.kind, "suggestions");
    if (result.kind === "suggestions") {
      assertEquals(result.names[0], "Reading");
    }
  });

  it("should sort suggestions by distance", () => {
    const result = matchActivity("writin", ["Writing", "Waiting", "Wishing"]);
    assertEquals(result.kind, "suggestions");
    if (result.kind === "suggestions") {
      assertEquals(result.names[0], "Writing");
    }
  });

  it("should return at most 3 suggestions", () => {
    const many = ["Aa", "Ab", "Ac", "Ad", "Ae"];
    const result = matchActivity("Ax", many);
    if (result.kind === "suggestions") {
      assertEquals(result.names.length <= 3, true);
    }
  });

  it("should return none when nothing is close", () => {
    assertEquals(matchActivity("xyzabc", names), { kind: "none" });
  });

  it("should return none for empty names list", () => {
    assertEquals(matchActivity("anything", []), { kind: "none" });
  });
});
