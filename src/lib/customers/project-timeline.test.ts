import { describe, expect, it } from "vitest";
import { currentMilestone, journeyPercent, nextMilestone, stepQuestion } from "./project-timeline";
import type { ProjectJourney } from "@/lib/project-journey";

const journey = {
  leadId: "l1",
  currentMilestoneKey: "SV",
  currentIndex: 2,
  projectPhase: "x",
  phaseIndex: 1,
  phases: [],
  completedCount: 2,
  totalCount: 4,
  percentComplete: 50.4,
  milestones: [
    { key: "ENQ", label: "Enquiry received", phase: "x", audience: "both", state: "completed", completedAt: "2026-10-20" },
    { key: "DES", label: "Design approved", phase: "x", audience: "both", state: "completed", completedAt: "2026-10-25" },
    { key: "SV", label: "Site visit", phase: "x", audience: "both", state: "current", completedAt: null, hint: "We check the roof." },
    { key: "INS", label: "Installation", phase: "x", audience: "both", state: "upcoming", completedAt: null },
  ],
} as unknown as ProjectJourney;

describe("project timeline helpers", () => {
  it("finds the current and next steps", () => {
    expect(currentMilestone(journey)?.key).toBe("SV");
    expect(nextMilestone(journey)?.key).toBe("INS");
    expect(currentMilestone(null)).toBeNull();
  });

  it("rounds and clamps the percent", () => {
    expect(journeyPercent(journey)).toBe(50);
    expect(journeyPercent({ ...journey, percentComplete: 140 })).toBe(100);
    expect(journeyPercent({ ...journey, percentComplete: Number.NaN })).toBe(50);
    expect(journeyPercent(null)).toBeNull();
  });

  it("asks about the step by name", () => {
    expect(stepQuestion(journey.milestones[2], journey.milestones[3])).toContain('"Site visit"');
    expect(stepQuestion(journey.milestones[2], journey.milestones[3])).toContain("Installation");
    expect(stepQuestion(journey.milestones[3])).toContain("prepare");
    expect(stepQuestion(journey.milestones[0])).toContain("is done");
  });
});
