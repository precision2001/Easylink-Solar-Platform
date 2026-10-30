import { describe, expect, it } from "vitest";
import {
  equipmentRows,
  generateProposalPdfBlob,
  nextStepsContent,
} from "./generateProposalPdf";
import {
  DESIGN_PROPOSAL_DEFAULTS,
  emptyEquipmentItems,
} from "@/lib/store/designProposalSlice";

describe("equipmentRows", () => {
  it("omits every category when nothing was selected", () => {
    const rows = equipmentRows({
      ...DESIGN_PROPOSAL_DEFAULTS,
      equipment: { ...DESIGN_PROPOSAL_DEFAULTS.equipment, items: emptyEquipmentItems() },
    });
    expect(rows).toEqual([]);
  });

  it("emits one row per non-empty category, joining multiple items with a quantity suffix", () => {
    const rows = equipmentRows({
      ...DESIGN_PROPOSAL_DEFAULTS,
      equipment: {
        ...DESIGN_PROPOSAL_DEFAULTS.equipment,
        items: {
          ...emptyEquipmentItems(),
          battery: [
            { productId: "b1", brand: "BYD", name: "HVS", quantity: 1, ratingLabel: "10 kWh" },
            { productId: "b2", brand: "Tesla", name: "Powerwall 3", quantity: 2, ratingLabel: "13.5 kWh" },
          ],
          evCharger: [
            { productId: "e1", brand: "Tesla", name: "Wall Connector", quantity: 1, ratingLabel: "11 kW" },
          ],
        },
      },
    });

    expect(rows).toEqual([
      ["Battery", "HVS (10 kWh), Powerwall 3 ×2 (13.5 kWh)"],
      ["EV charger", "Wall Connector (11 kW)"],
    ]);
  });

  it("omits the EV charger / heat pump rows entirely when those categories are unused", () => {
    const rows = equipmentRows({
      ...DESIGN_PROPOSAL_DEFAULTS,
      equipment: {
        ...DESIGN_PROPOSAL_DEFAULTS.equipment,
        items: {
          ...emptyEquipmentItems(),
          solarPanel: [
            { productId: "p1", brand: "Trina", name: "TSM-630", quantity: 16, ratingLabel: "630 W" },
          ],
        },
      },
    });

    expect(rows.map(([label]) => label)).toEqual(["Solar panels"]);
  });
});

describe("nextStepsContent", () => {
  const today = new Date(2026, 9, 31);
  const origin = "https://easylinksolar.com.au";

  it("falls back to the portal and public designer when there are no links", () => {
    const c = nextStepsContent({}, today, origin);
    expect(c.portalUrl).toBe("https://easylinksolar.com.au/customers/design");
    expect(c.portalLabel).toBe("easylinksolar.com.au/customers/design");
    expect(c.referralCode).toBeNull();
    expect(c.referralUrl).toBe("https://easylinksolar.com.au/designs");
  });

  it("holds the price 30 days and dates the rebates to today", () => {
    const c = nextStepsContent({}, today, origin);
    expect(c.validUntil).toBe("30 November 2026");
    expect(c.rebatesAsAt).toBe("31 October 2026");
  });

  it("uses the customer's referral code and share link when given", () => {
    const c = nextStepsContent(
      { referralCode: "ALEX1", referralUrl: `${origin}/shared/tok?ref=ALEX1` },
      today,
      origin,
    );
    expect(c.referralCode).toBe("ALEX1");
    expect(c.referralUrl).toBe(`${origin}/shared/tok?ref=ALEX1`);
  });

  it("builds a signup link from a code alone", () => {
    const c = nextStepsContent({ referralCode: "A B" }, today, origin);
    expect(c.referralUrl).toBe(`${origin}/customers/auth?ref=A%20B`);
  });
});

describe("generateProposalPdfBlob", () => {
  it("ends with the next-step page", async () => {
    const blob = await generateProposalPdfBlob(
      { ...DESIGN_PROPOSAL_DEFAULTS, customer: { ...DESIGN_PROPOSAL_DEFAULTS.customer, name: "Alex Smith" } },
      { referralCode: "ALEX1" },
    );
    const text = Buffer.from(await blob.arrayBuffer()).toString("latin1");
    expect(text).toContain("Book your free site check");
    expect(text).toContain("ALEX1");
  });
});
