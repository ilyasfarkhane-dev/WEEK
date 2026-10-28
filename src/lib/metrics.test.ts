import { describe, expect, it } from "vitest";
import { compareTarget, countByStage, helpResponseWithinTarget, ratio, readTargets, workingDaysBetween } from "@/lib/metrics";

describe("programme measures", () => {
  it("does not invent a rate when the denominator is zero", () => {
    expect(ratio(1, 0)).toBeNull();
    expect(compareTarget(null, 60)).toBe("insufficient");
  });

  it("counts only weekdays between two dates", () => {
    const friday = new Date("2026-10-23T12:00:00Z");
    const monday = new Date("2026-10-26T09:00:00Z");
    expect(workingDaysBetween(friday, monday)).toBe(1);
  });

  it("treats a same-week response inside five working days as met", () => {
    const created = new Date("2026-10-19T09:00:00Z");
    const answered = new Date("2026-10-23T15:00:00Z");
    expect(helpResponseWithinTarget(created, answered, 5)).toBe(true);
    expect(helpResponseWithinTarget(created, null, 5)).toBe(false);
  });

  it("keeps proposed targets separate from missing configuration", () => {
    expect(readTargets({ cohortSize: 40 }).cohortSize).toBe(40);
    expect(readTargets(null).reviewedCanvases).toBe(8);
  });

  it("counts stages without filling missing ones with invented projects", () => {
    expect(countByStage(["TESTING", "TESTING"]).TESTING).toBe(2);
    expect(countByStage([]).PROBLEM_DEFINED).toBe(0);
  });
});
