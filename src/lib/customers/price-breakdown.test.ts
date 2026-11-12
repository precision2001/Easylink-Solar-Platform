import { describe, expect, it } from "vitest";
import { breakdown, pickQuote, worksLines } from "./price-breakdown";
import type { Quote } from "@/lib/quotes";

const base = (over: Partial<Quote>): Quote =>
  ({
    id: "q1", number: 1, leadId: null, customerId: "c", sourceDesignId: null, version: 1, status: "SENT", title: "T",
    snapshot: {
      equipment: [{ category: "panel", name: "440 W panel", brand: "Trina", quantity: 20, unitPriceCents: 20000, totalCents: 400000 }],
      extras: [{ category: "works", name: "Switchboard upgrade", quantity: 1, unitPriceCents: 90000, totalCents: 90000 }],
    },
    systemKw: 8.8, panelCount: 20, batteryKwh: null, subtotalCents: 490000, stcDiscountCents: 250000, rebateCents: 0,
    totalCents: 240000, depositMode: "PERCENT", depositPercent: 25, depositCents: 60000, validUntil: "2099-01-01T00:00:00Z",
    notes: null, sentAt: null, viewedAt: null, acceptedAt: null, declinedAt: null, declineReason: null, depositPaidAt: null,
    createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-01T00:00:00Z", ...over,
  }) as Quote;

describe("price breakdown", () => {
  it("prefers the accepted quote, then the newest open one", () => {
    const a = base({ id: "a", createdAt: "2026-11-02T00:00:00Z" });
    const b = base({ id: "b", status: "ACCEPTED", createdAt: "2026-10-01T00:00:00Z" });
    expect(pickQuote([a, b])?.id).toBe("b");
    const c = base({ id: "c", createdAt: "2026-11-05T00:00:00Z" });
    expect(pickQuote([a, c])?.id).toBe("c");
    expect(pickQuote([])).toBeNull();
  });

  it("lists items, works and rebates from the quote only", () => {
    const { rows, savedCents } = breakdown(base({}));
    expect(rows.map((r) => r.kind)).toEqual(["item", "works", "rebate", "total"]);
    expect(rows[0].detail).toBe("20 × Trina");
    expect(rows[2].cents).toBe(-250000);
    expect(rows.at(-1)?.cents).toBe(240000);
    expect(savedCents).toBe(250000);
  });

  it("returns works lines", () => {
    expect(worksLines(base({})).map((l) => l.name)).toEqual(["Switchboard upgrade"]);
    expect(worksLines(null)).toEqual([]);
  });
});
