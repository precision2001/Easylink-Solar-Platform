import { describe, expect, it } from "vitest";
import { installerLeadStage, stageTotals } from "./pipelineStages";

describe("installerLeadStage", () => {
  it("reads the lead's stage", () => {
    expect(installerLeadStage({ stage: "DESIGNING" })).toBe("DESIGNING");
    expect(installerLeadStage({ stage: "PAYMENT_COMPLETED" })).toBe("PAYMENT_COMPLETED");
  });

  it("falls back to the backend default for missing or unknown values", () => {
    expect(installerLeadStage({})).toBe("NEW_LEAD");
    expect(installerLeadStage({ stage: null })).toBe("NEW_LEAD");
    // An old status value is not a stage.
    expect(installerLeadStage({ stage: "QUALIFIED" })).toBe("NEW_LEAD");
  });
});

describe("stageTotals", () => {
  it("counts every stage in pipeline order, including empty ones", () => {
    const totals = stageTotals([
      { stage: "NEW_LEAD" },
      { stage: "DESIGNING" },
      { stage: "DESIGNING" },
    ]);
    expect(totals.map((t) => t.stage)).toEqual([
      "NEW_LEAD",
      "APPOINTMENT",
      "SITE_ASSESSMENT",
      "DESIGNING",
      "PROPOSAL_SENT",
      "DEPOSIT_PAID",
      "INSTALLING",
      "PAYMENT_COMPLETED",
    ]);
    expect(totals.find((t) => t.stage === "DESIGNING")).toEqual({
      stage: "DESIGNING",
      label: "Designing",
      count: 2,
    });
    expect(totals.find((t) => t.stage === "INSTALLING")?.count).toBe(0);
  });
});
