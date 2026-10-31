import { describe, expect, it } from "vitest";
import { equipmentRows } from "./generateProposalPdf";
import { resolveLinks } from "./loadProposalDocument";
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

describe("resolveLinks", () => {
  const origin = "https://easylinksolar.com.au";

  it("falls back to the portal and public designer when there are no links", () => {
    const c = resolveLinks({}, origin);
    expect(c.portalUrl).toBe("https://easylinksolar.com.au/customers/design");
    expect(c.portalLabel).toBe("easylinksolar.com.au/customers/design");
    expect(c.referralCode).toBeNull();
    expect(c.referralUrl).toBe("https://easylinksolar.com.au/designs");
  });

  it("uses the customer's referral code and share link when given", () => {
    const c = resolveLinks({ referralCode: "ALEX1", referralUrl: `${origin}/shared/tok?ref=ALEX1` }, origin);
    expect(c.referralCode).toBe("ALEX1");
    expect(c.referralUrl).toBe(`${origin}/shared/tok?ref=ALEX1`);
  });

  it("builds a signup link from a code alone", () => {
    const c = resolveLinks({ referralCode: "A B" }, origin);
    expect(c.referralUrl).toBe(`${origin}/customers/auth?ref=A%20B`);
  });
});
