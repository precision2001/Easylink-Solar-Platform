import { describe, expect, it } from "vitest";
import type { DesignOptionCard, DesignOptions } from "./design-options";
import type { ProjectJourney } from "@/lib/project-journey";
import {
  EMPTY_VALUE,
  buildCustomerDashboardSummary,
  selectedDesignOption,
} from "./dashboard-summary";

function card(overrides: Partial<DesignOptionCard>): DesignOptionCard {
  return {
    key: "standard",
    designId: null,
    title: "Standard",
    summary: "",
    kw: 0,
    panelCount: 0,
    price: 0,
    estimatedSavings: 0,
    annualOutputKwh: 0,
    imageSrc: "",
    isCustom: false,
    selected: false,
    editable: false,
    status: null,
    ...overrides,
  };
}

function options(cards: DesignOptionCard[], selectedKey: string | null = null): DesignOptions {
  return {
    options: cards,
    selectedKey,
    selectedDesignId: null,
    locked: false,
    hasCompletedDesignWizard: true,
  };
}

const journey: ProjectJourney = {
  leadId: "lead-1",
  currentMilestoneKey: "site_visit",
  currentIndex: 1,
  projectPhase: "DESIGN_AND_PERMISSIONS",
  phaseIndex: 0,
  phases: [],
  milestones: [
    { key: "enquiry", label: "Enquiry received", phase: "DESIGN_AND_PERMISSIONS", audience: "both", state: "completed", completedAt: "2026-10-01T00:00:00Z" },
    { key: "site_visit", label: "Site visit", phase: "DESIGN_AND_PERMISSIONS", audience: "both", state: "current", completedAt: null },
  ],
  completedCount: 1,
  totalCount: 6,
  percentComplete: 16.7,
};

describe("selectedDesignOption", () => {
  it("prefers the card flagged selected, then the selected key", () => {
    const a = card({ key: "a" });
    const b = card({ key: "b", selected: true });
    expect(selectedDesignOption(options([a, b], "a"))?.key).toBe("b");
    expect(selectedDesignOption(options([a, card({ key: "c" })], "c"))?.key).toBe("c");
    expect(selectedDesignOption(options([a], null))).toBeNull();
    expect(selectedDesignOption(null)).toBeNull();
  });
});

describe("buildCustomerDashboardSummary", () => {
  it("shows only empty values when nothing is loaded", () => {
    const s = buildCustomerDashboardSummary({
      journey: null,
      journeyLoading: false,
      designOptions: null,
    });
    expect(s.progressLabel).toMatch(/once your project starts/);
    expect(s.stats.every((x) => x.value === EMPTY_VALUE)).toBe(true);
    expect(s.kpis.every((k) => k.value === EMPTY_VALUE)).toBe(true);
    expect(s.kpis.every((k) => k.sublabel === "Choose a design below")).toBe(true);
  });

  it("uses the journey percent and current milestone", () => {
    const s = buildCustomerDashboardSummary({
      journey,
      journeyLoading: false,
      designOptions: null,
    });
    expect(s.progressLabel).toBe("Your solar journey is 17% complete");
    expect(s.stats.find((x) => x.label === "Current step")?.value).toBe("Site visit");
  });

  it("says loading, not 'choose a design', while options are in flight", () => {
    const s = buildCustomerDashboardSummary({
      journey: null,
      journeyLoading: false,
      designOptions: null,
      designsLoading: true,
    });
    expect(s.kpis.every((k) => k.sublabel === "Loading…")).toBe(true);
  });

  it("reports loading while the journey is in flight", () => {
    const s = buildCustomerDashboardSummary({
      journey: null,
      journeyLoading: true,
      designOptions: null,
    });
    expect(s.progressLabel).toMatch(/Loading/);
  });

  it("fills KPIs from the selected design and prefers the after-STC price", () => {
    const s = buildCustomerDashboardSummary({
      journey,
      journeyLoading: false,
      designOptions: options([
        card({
          key: "custom",
          selected: true,
          kw: 6.6,
          panelCount: 15,
          annualOutputKwh: 9636,
          estimatedSavings: 1840,
          price: 9900,
          priceAfterStc: 7400,
        }),
      ]),
    });
    const byId = Object.fromEntries(s.kpis.map((k) => [k.id, k]));
    expect(byId["system-size"].value).toBe("6.6 kW");
    expect(byId["system-size"].sublabel).toBe("15 panels");
    expect(byId["annual-output"].value).toBe("9,636 kWh");
    expect(byId["est-savings"].value).toBe("$1,840/yr");
    expect(byId["total-price"].value).toBe("$7,400");
    expect(byId["total-price"].sublabel).toMatch(/after STC/);
    expect(s.stats[0].value).toBe("6.6 kW");
  });

  it("keeps zero figures on a selected design as empty, not $0", () => {
    const s = buildCustomerDashboardSummary({
      journey: null,
      journeyLoading: false,
      designOptions: options([card({ key: "x", selected: true, kw: 5 })]),
    });
    const byId = Object.fromEntries(s.kpis.map((k) => [k.id, k]));
    expect(byId["system-size"].value).toBe("5.0 kW");
    expect(byId["total-price"].value).toBe(EMPTY_VALUE);
    expect(byId["total-price"].sublabel).toBe("Confirmed at quote");
    expect(byId["est-savings"].value).toBe(EMPTY_VALUE);
  });
});
