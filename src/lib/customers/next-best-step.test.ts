import { describe, expect, it } from "vitest";
import { insightsFor, nextBestStep } from "./next-best-step";
import type { DesignOptions } from "./design-options";
import type { ProjectJourney } from "@/lib/project-journey";

const opt = (over: Record<string, unknown> = {}) => ({
  key: "custom", designId: "d1", title: "Your design", summary: "", kw: 10, panelCount: 24, price: 20000,
  priceAfterStc: 15000, estimatedSavings: 3000, annualOutputKwh: 14000, imageSrc: "", isCustom: true,
  selected: true, editable: true, status: null, ...over,
});
const options = (list = [opt()], extra: Partial<DesignOptions> = {}): DesignOptions => ({
  options: list as DesignOptions["options"], selectedKey: "custom", selectedDesignId: "d1", locked: false, hasCompletedDesignWizard: true, ...extra,
});
const journey = (states: ("completed" | "current" | "upcoming")[]): ProjectJourney => ({
  leadId: "l", currentMilestoneKey: `m${states.indexOf("current")}`, currentIndex: Math.max(0, states.indexOf("current")),
  projectPhase: "x" as ProjectJourney["projectPhase"], phaseIndex: 0, phases: [], completedCount: 0, totalCount: states.length,
  percentComplete: states.every((s) => s === "completed") ? 100 : 40,
  milestones: states.map((state, i) => ({ key: `m${i}`, label: `Step ${i}`, phase: "x" as ProjectJourney["projectPhase"], audience: "both", state, completedAt: null })),
});

describe("nextBestStep", () => {
  it("sends a new customer to the designer", () => {
    const s = nextBestStep({ journey: null, options: { ...options([]), selectedKey: null, hasCompletedDesignWizard: false } });
    expect(s.primary.href).toBe("/designs");
  });
  it("asks them to choose when nothing is selected", () => {
    const s = nextBestStep({ journey: null, options: options([opt({ selected: false })], { selectedKey: null }) });
    expect(s.primary.href).toBe("#designs");
  });
  it("names the current step and what follows", () => {
    const s = nextBestStep({ journey: journey(["completed", "current", "upcoming", "upcoming"]), options: options() });
    expect(s.title).toContain("Step 1");
    expect(s.points).toContain("Then: Step 2.");
  });
  it("points finished customers to maintenance", () => {
    const s = nextBestStep({ journey: journey(["completed", "completed"]), options: options() });
    expect(s.primary.href).toBe("/customers/solar-maintenance");
  });
});

describe("insightsFor", () => {
  it("works out payback from real figures and never invents", () => {
    const list = insightsFor(options());
    expect(list[0].text).toContain("about 5.0 years");
    expect(list.some((i) => i.text.includes("$5,000 off"))).toBe(true);
    expect(insightsFor(null)).toEqual([]);
  });
  it("points out a better-saving option only while the choice is open", () => {
    const two = [opt(), opt({ key: "max", title: "Maximum", selected: false, estimatedSavings: 3600 })];
    expect(insightsFor(options(two)).some((i) => i.text.startsWith("Maximum would save about $600"))).toBe(true);
    expect(insightsFor(options(two, { locked: true })).some((i) => i.text.startsWith("Maximum"))).toBe(false);
  });
});
