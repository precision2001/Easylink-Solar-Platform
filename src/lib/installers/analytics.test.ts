import { describe, expect, it } from "vitest";
import { measuredSecondaryKpis } from "./analytics";

const kpi = (title: string) => ({
  title,
  value: "$1",
  delta: "",
  icon: "Dollar",
  iconColor: "#000",
  iconBackgroundColor: "#fff",
});

describe("measuredSecondaryKpis", () => {
  it("drops the formula-derived net profit and keeps measured figures", () => {
    const out = measuredSecondaryKpis([
      kpi("Average Deal Size"),
      kpi("Net Profit"),
      kpi("Installs This Month"),
      kpi("Pending Proposals"),
    ]);
    expect(out.map((k) => k.title)).toEqual([
      "Average Deal Size",
      "Installs This Month",
      "Pending Proposals",
    ]);
  });

  it("matches regardless of case and spacing", () => {
    expect(measuredSecondaryKpis([kpi(" net profit ")])).toEqual([]);
  });
});
