import { afterEach, describe, expect, it, vi } from "vitest";
import { estimateSavings, fetchProposalPricing } from "./proposalPricing";

// Pricing itself now runs in the backend (solar_panel_backend
// src/tests/pricing-engine-v2.test.ts covers the 57-panel three-phase,
// hybrid-at-200% and battery cases). Here: the request/response contract.
describe("fetchProposalPricing", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("posts the design to the public pricing proxy and unwraps the data", async () => {
    const data = { selected: { net: 9876 }, tierTotals: {}, tierInfo: {}, batteryTotals: {}, installDate: "2026-11-27", zone: 3 };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await fetchProposalPricing({ panelCount: 19, batteryKwh: 14.6 });
    expect(res.selected.net).toBe(9876);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/pricing/proposal");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ panelCount: 19, batteryKwh: 14.6 });
  });

  it("throws the backend's message when pricing fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Too many pricing requests" }), { status: 429 })));
    await expect(fetchProposalPricing({ panelCount: 19 })).rejects.toThrow("Too many pricing requests");
  });
});

describe("estimateSavings", () => {
  it("grows with system size and never takes the bill below zero", () => {
    const small = estimateSavings(300, 3);
    const big = estimateSavings(300, 22.8);
    expect(big.monthlySavings).toBeGreaterThan(small.monthlySavings);
    expect(big.newBill).toBeGreaterThanOrEqual(0);
    expect(big.monthlySavings).toBeLessThanOrEqual(300);
  });
  it("a battery saves more on the same system", () => {
    expect(estimateSavings(300, 6.6, 13.5).yearlySavings).toBeGreaterThan(estimateSavings(300, 6.6).yearlySavings);
  });
});
