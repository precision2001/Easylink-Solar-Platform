import { describe, expect, it } from "vitest";
import {
  balanceCents,
  compareRows,
  dateInputValue,
  depositLabel,
  dollarsToCents,
  effectiveStatus,
  endOfSydneyDayIso,
  expiresInText,
  formatCents,
  isDepositDue,
  isOpen,
  previewDepositCents,
  quoteLines,
  quoteQuestion,
  quoteStatusLabel,
  quoteStatusTone,
  quoteSystemSummary,
  quoteVersionLabel,
  sortQuotes,
  staffActionsFor,
  staffQuotesUrl,
  type Quote,
  editedTotals,
  isHandEdited,
  lineTotal,
  signedDollarsToCents,
} from "./quotes";
import { CUSTOMER_QUOTE_ACTIONS, STAFF_QUOTE_ACTIONS, isAllowedQuoteAction } from "./quotes-actions";

const NOW = new Date("2026-11-08T02:00:00Z"); // 1 pm in Sydney

function quote(over: Partial<Quote> = {}): Quote {
  return {
    id: "q1",
    number: 123,
    leadId: "l1",
    customerId: "c1",
    sourceDesignId: "d1",
    version: 2,
    status: "SENT",
    title: "6.6 kW solar + 10 kWh battery",
    snapshot: {
      address: "14 Banksia St, Marrickville NSW 2204",
      equipment: [
        { category: "panel", name: "Jinko Tiger Neo 440 W", brand: "Jinko", model: "Tiger Neo 440", quantity: 15, unitPriceCents: 26_000, totalCents: 390_000 },
        { category: "battery", name: "Sigenergy SigenStor 10 kWh", brand: "Sigenergy", quantity: 1, unitPriceCents: 980_000, totalCents: 980_000 },
      ],
      extras: [{ category: "installation", name: "Standard installation", quantity: 1, unitPriceCents: 450_000, totalCents: 450_000 }],
    },
    systemKw: 6.6,
    panelCount: 15,
    batteryKwh: 10,
    subtotalCents: 1_820_000,
    stcDiscountCents: 252_000,
    rebateCents: 0,
    totalCents: 1_568_000,
    depositMode: "PERCENT",
    depositPercent: 25,
    depositCents: 392_000,
    validUntil: "2026-12-08T12:59:59Z",
    notes: null,
    internalNotes: null,
    createdBy: { firstName: "Mia", lastName: "Nguyen" },
    sentAt: "2026-11-06T00:00:00Z",
    viewedAt: null,
    acceptedAt: null,
    declinedAt: null,
    declineReason: null,
    depositPaidAt: null,
    createdAt: "2026-11-05T00:00:00Z",
    updatedAt: "2026-11-06T00:00:00Z",
    ...over,
  };
}

describe("money", () => {
  it("formats cents as Australian dollars, keeping cents only when there are some", () => {
    expect(formatCents(1_568_000)).toBe("$15,680");
    expect(formatCents(399_550)).toBe("$3,995.50");
    expect(formatCents(null)).toBe("—");
  });
  it("reads typed dollars", () => {
    expect(dollarsToCents("$3,995.50")).toBe(399_550);
    expect(dollarsToCents("4000")).toBe(400_000);
    expect(dollarsToCents("abc")).toBeNull();
    expect(dollarsToCents("")).toBeNull();
  });
  it("works out the deposit and balance like the backend", () => {
    expect(previewDepositCents(1_568_000, "PERCENT", 25, null)).toBe(392_000);
    expect(previewDepositCents(1_568_000, "PERCENT", 150, null)).toBe(1_568_000);
    expect(previewDepositCents(1_568_000, "FIXED", 25, 200_000)).toBe(200_000);
    expect(previewDepositCents(100, "FIXED", 25, 200_000)).toBe(100);
    expect(balanceCents(quote())).toBe(1_176_000);
    expect(depositLabel(quote())).toBe("Deposit (25%)");
    expect(depositLabel(quote({ depositMode: "FIXED" }))).toBe("Deposit");
  });
});

describe("labels and status", () => {
  it("names the version", () => {
    expect(quoteVersionLabel(quote())).toBe("Quote 2 · Q-000123");
  });
  it("treats a sent quote past its date as expired", () => {
    const old = quote({ validUntil: "2026-11-01T00:00:00Z" });
    expect(effectiveStatus(old, NOW)).toBe("EXPIRED");
    expect(isOpen(old, NOW)).toBe(false);
    expect(isOpen(quote(), NOW)).toBe(true);
    expect(isOpen(quote({ status: "DRAFT" }), NOW)).toBe(false);
  });
  it("tells accepted quotes apart by whether the deposit is in", () => {
    const accepted = quote({ status: "ACCEPTED" });
    expect(quoteStatusLabel(accepted, NOW)).toBe("Accepted · deposit due");
    expect(quoteStatusTone(accepted, NOW)).toBe("warn");
    expect(isDepositDue(accepted)).toBe(true);
    const paid = quote({ status: "ACCEPTED", depositPaidAt: "2026-11-07T00:00:00Z" });
    expect(quoteStatusLabel(paid, NOW)).toBe("Deposit paid");
    expect(quoteStatusTone(paid, NOW)).toBe("good");
    expect(isDepositDue(paid)).toBe(false);
    expect(quoteStatusLabel(quote({ status: "SUPERSEDED" }), NOW)).toBe("Replaced");
  });
  it("counts expiry in Sydney calendar days", () => {
    expect(expiresInText("2026-12-08T12:59:59Z", NOW)).toBe("Valid for 30 more days");
    expect(expiresInText("2026-11-08T12:00:00Z", NOW)).toBe("Expires today");
    expect(expiresInText("2026-11-09T12:00:00Z", NOW)).toBe("Expires tomorrow");
    expect(expiresInText("2026-11-05T12:00:00Z", NOW)).toBe("Expired 3 days ago");
    expect(expiresInText(null, NOW)).toBe("No expiry date");
  });
  it("turns a date input into the end of that Sydney day", () => {
    const iso = endOfSydneyDayIso("2026-12-08")!;
    expect(dateInputValue(iso)).toBe("2026-12-08");
    expect(iso).toBe("2026-12-08T12:59:59.000Z"); // AEDT, UTC+11
    expect(endOfSydneyDayIso("2026-06-08")).toBe("2026-06-08T13:59:59.000Z"); // AEST, UTC+10
    expect(endOfSydneyDayIso("nope")).toBeNull();
  });
  it("offers only the actions the backend allows", () => {
    expect(staffActionsFor(quote({ status: "DRAFT" }), NOW)).toEqual({ edit: true, reprice: true, send: true, paymentLink: false, withdraw: true, editLines: true });
    expect(staffActionsFor(quote(), NOW)).toEqual({ edit: true, reprice: false, send: false, paymentLink: true, withdraw: true, editLines: true });
    expect(staffActionsFor(quote({ status: "VIEWED" }), NOW).edit).toBe(false);
    expect(staffActionsFor(quote({ status: "ACCEPTED", depositPaidAt: "x" }), NOW)).toEqual({ edit: false, reprice: false, send: false, paymentLink: false, withdraw: false, editLines: true });
    expect(staffActionsFor(quote({ status: "ACCEPTED" }), NOW).paymentLink).toBe(true);
  });
  it("sorts newest version first", () => {
    const list = sortQuotes([quote({ id: "a", version: 1 }), quote({ id: "c", version: 3 }), quote({ id: "b", version: 2 })]);
    expect(list.map((q) => q.id)).toEqual(["c", "b", "a"]);
  });
});

describe("snapshot", () => {
  it("reads equipment and extras, skipping junk", () => {
    const lines = quoteLines(quote({ snapshot: { equipment: [{ name: "Panel", quantity: 2, unitPriceCents: 100 }, null, { quantity: 1 }], works: [{ name: "Switchboard upgrade", totalCents: 90_000 }] } as unknown as Quote["snapshot"] }));
    expect(lines.equipment).toHaveLength(1);
    expect(lines.equipment[0].totalCents).toBe(200);
    expect(lines.extras[0].name).toBe("Switchboard upgrade");
    expect(quoteLines(quote({ snapshot: null }))).toEqual({ equipment: [], extras: [] });
  });
  it("summarises only real figures", () => {
    expect(quoteSystemSummary(quote())).toBe("6.6 kW solar · 15 panels · 10 kWh battery");
    expect(quoteSystemSummary(quote({ batteryKwh: null, panelCount: 0 }))).toBe("6.6 kW solar");
  });
});

describe("compare and AI", () => {
  it("lines versions up row by row", () => {
    const rows = compareRows([quote(), quote({ id: "q2", version: 1, batteryKwh: null, totalCents: 698_000, depositCents: 174_500 })], NOW);
    const total = rows.find((r) => r.label === "Total inc GST")!;
    expect(total.values).toEqual(["$15,680", "$6,980"]);
    expect(rows.find((r) => r.label === "Balance on completion")!.values[1]).toBe("$5,235");
  });
  it("builds the AI question from the real quote", () => {
    const q = quoteQuestion(quote(), NOW);
    expect(q).toContain("Quote 2 · Q-000123");
    expect(q).toContain("$15,680 inc GST");
    expect(q).toContain("STC discount of $2,520");
    expect(q).toContain("15 × Jinko Tiger Neo 440");
  });
});

describe("proxies", () => {
  it("builds staff list urls", () => {
    expect(staffQuotesUrl("admin", { leadId: "l 1" })).toBe("/api/admin/quotes?leadId=l+1");
    expect(staffQuotesUrl("installer", { customerId: "c1" })).toBe("/api/installers/quotes?customerId=c1");
  });
  it("only allows the listed actions", () => {
    expect(isAllowedQuoteAction(STAFF_QUOTE_ACTIONS, "payment-link")).toBe(true);
    expect(isAllowedQuoteAction(STAFF_QUOTE_ACTIONS, "accept")).toBe(false);
    expect(isAllowedQuoteAction(CUSTOMER_QUOTE_ACTIONS, "accept")).toBe(true);
    expect(isAllowedQuoteAction(CUSTOMER_QUOTE_ACTIONS, "send")).toBe(false);
  });
});

describe("hand-edited lines", () => {
  it("reads signed dollars, so a discount line can be negative", () => {
    expect(signedDollarsToCents("1,250.50")).toBe(125_050);
    expect(signedDollarsToCents("-500")).toBe(-50_000);
    expect(signedDollarsToCents("$0")).toBe(0);
    expect(signedDollarsToCents("abc")).toBeNull();
    expect(signedDollarsToCents("1.234")).toBeNull();
  });

  it("totals lines the same way as the backend", () => {
    expect(editedTotals([{ quantity: 15, unitPriceCents: 26_500 }, { quantity: 1, unitPriceCents: 890_000 }, { quantity: 1, unitPriceCents: 320_000 }], 252_000, 330_000)).toEqual({
      subtotalCents: 1_607_500,
      totalCents: 1_025_500,
    });
    expect(lineTotal(2.5, 333)).toBe(833);
  });

  it("derives a unit price for works lines that only carry a total", () => {
    const { extras } = quoteLines({ snapshot: { works: [{ name: "Install", quantity: 2, totalCents: 640_000 }] } });
    expect(extras[0]).toMatchObject({ quantity: 2, unitPriceCents: 320_000, totalCents: 640_000 });
  });

  it("knows when the prices were edited by hand", () => {
    expect(isHandEdited({ snapshot: { pricing: { source: "MANUAL" } } })).toBe(true);
    expect(isHandEdited({ snapshot: { pricing: { source: "PRICING_ENGINE" } } })).toBe(false);
    expect(isHandEdited({ snapshot: null })).toBe(false);
  });
});
