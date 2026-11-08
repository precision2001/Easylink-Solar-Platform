import { describe, expect, it } from "vitest";
import { insightsFor, nextBestStep } from "./next-best-step";
import type { DesignOptions } from "./design-options";
import type { ProjectJourney } from "@/lib/project-journey";
import type { Quote } from "@/lib/quotes";

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

const NOW = new Date("2026-11-08T02:00:00Z");
const quote = (over: Partial<Quote> = {}): Quote => ({
  id: "q1", number: 123, leadId: "l1", customerId: "c1", sourceDesignId: "d1", version: 2, status: "SENT",
  title: "6.6 kW solar + 10 kWh battery", snapshot: null, systemKw: 6.6, panelCount: 15, batteryKwh: 10,
  subtotalCents: 1_820_000, stcDiscountCents: 252_000, rebateCents: 0, totalCents: 1_568_000, depositMode: "PERCENT",
  depositPercent: 25, depositCents: 392_000, validUntil: "2026-12-08T12:59:59Z", notes: null, sentAt: "2026-11-06T00:00:00Z",
  viewedAt: null, acceptedAt: null, declinedAt: null, declineReason: null, depositPaidAt: null,
  createdAt: "2026-11-05T00:00:00Z", updatedAt: "2026-11-06T00:00:00Z", ...over,
});

describe("nextBestStep with quotes", () => {
  it("points to a sent quote that's still open", () => {
    const s = nextBestStep({ journey: null, options: options(), quotes: [quote({ status: "VIEWED" })], now: NOW });
    expect(s.title).toBe("Your quote is ready.");
    expect(s.primary.href).toBe("/customers/design#quotes");
    expect(s.points[0]).toContain("$15,680 inc GST");
    expect(s.points[1]).toContain("$3,920 deposit");
  });
  it("asks for the deposit once a quote is accepted", () => {
    const s = nextBestStep({ journey: null, options: options(), quotes: [quote({ status: "ACCEPTED" })], now: NOW });
    expect(s.title).toBe("Pay your deposit to lock in your install.");
    expect(s.primary.href).toBe("/customers/design?quote=q1#quotes");
    expect(s.points[1]).toContain("$11,760");
  });
  it("ignores expired, paid and declined quotes", () => {
    const quotes = [
      quote({ id: "a", validUntil: "2026-11-01T00:00:00Z" }),
      quote({ id: "b", status: "ACCEPTED", depositPaidAt: "2026-11-07T00:00:00Z" }),
      quote({ id: "c", status: "DECLINED" }),
    ];
    const s = nextBestStep({ journey: null, options: options(), quotes, now: NOW });
    expect(s.primary.href).toBe("/customers/design");
  });
  it("counts open quotes to compare", () => {
    const s = nextBestStep({ journey: null, options: options(), quotes: [quote(), quote({ id: "q0", version: 1 })], now: NOW });
    expect(s.primary.label).toBe("Compare my quotes");
    expect(s.points[1]).toContain("2 quotes");
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
