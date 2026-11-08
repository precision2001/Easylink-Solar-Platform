import { describe, expect, it } from "vitest";
import type { CustomerPayment } from "./payments";
import {
  explainPaymentQuestion,
  paymentKindLabel,
  paymentMethodLabel,
  paymentTitle,
  summarisePayments,
} from "./payment-view";

function pay(over: Partial<CustomerPayment>): CustomerPayment {
  return {
    id: "p1",
    provider: "stripe",
    installerId: null,
    customerId: "c1",
    status: "PAID",
    amount: 100,
    amountRefunded: 0,
    amountMinor: 10000,
    currency: "AUD",
    description: "Thing",
    customerEmail: "a@b.com",
    customerName: "A B",
    stripeSessionId: null,
    stripePaymentIntentId: null,
    receiptUrl: null,
    failureMessage: null,
    paidAt: "2026-10-20T01:00:00Z",
    createdAt: "2026-10-20T00:00:00Z",
    updatedAt: "2026-10-20T01:00:00Z",
    kind: "PRODUCT_ORDER",
    productId: null,
    quantity: null,
    ...over,
  };
}

describe("paymentKindLabel", () => {
  it("labels every backend kind, including website quotes", () => {
    expect(paymentKindLabel("SERVICE")).toBe("Installer service");
    expect(paymentKindLabel("PRODUCT_ORDER")).toBe("Product order");
    expect(paymentKindLabel("AD_QUOTE")).toBe("Website package");
    expect(paymentKindLabel("QUOTE_DEPOSIT")).toBe("Quote deposit");
  });

  it("never returns a blank label", () => {
    expect(paymentKindLabel("SITE_DEPOSIT")).toBe("Site deposit");
    expect(paymentKindLabel("")).toBe("Payment");
    expect(paymentKindLabel(undefined)).toBe("Payment");
  });
});

describe("paymentMethodLabel", () => {
  it("names the provider", () => {
    expect(paymentMethodLabel("stripe")).toBe("Card (Stripe)");
    expect(paymentMethodLabel("afterpay")).toBe("Afterpay");
    expect(paymentMethodLabel("ZIP")).toBe("Zip");
    expect(paymentMethodLabel("")).toBe("Card");
  });
});

describe("paymentTitle", () => {
  it("falls back to the kind when the description is blank", () => {
    expect(paymentTitle({ description: "  ", kind: "AD_QUOTE" })).toBe("Website package");
    expect(paymentTitle({ description: "Fronius Primo 5.0", kind: "PRODUCT_ORDER" })).toBe("Fronius Primo 5.0");
  });
});

describe("summarisePayments", () => {
  it("totals what stayed paid, less refunds, and lists pending payments", () => {
    const s = summarisePayments([
      pay({ id: "a", amount: 500 }),
      pay({ id: "b", amount: 200, amountRefunded: 50 }),
      pay({ id: "c", amount: 300, status: "REFUNDED" }),
      pay({ id: "d", amount: 120, status: "PENDING", paidAt: null, createdAt: "2026-11-01T00:00:00Z" }),
      pay({ id: "e", amount: 999, status: "FAILED" }),
    ]);
    expect(s.totalPaid).toBe(650);
    expect(s.paidCount).toBe(2);
    expect(s.refunded).toBe(350);
    expect(s.pending.map((p) => p.id)).toEqual(["d"]);
    expect(s.pendingTotal).toBe(120);
    expect(s.currency).toBe("AUD");
  });

  it("only adds payments in the main currency", () => {
    const s = summarisePayments([pay({ id: "a", amount: 100 }), pay({ id: "b", amount: 70, currency: "NZD", paidAt: "2026-01-01T00:00:00Z" })]);
    expect(s.totalPaid).toBe(100);
  });

  it("is zero with no payments", () => {
    const s = summarisePayments([]);
    expect(s).toMatchObject({ totalPaid: 0, paidCount: 0, pendingTotal: 0, pending: [] });
  });
});

describe("explainPaymentQuestion", () => {
  it("builds a specific question from the row", () => {
    const q = explainPaymentQuestion(pay({ description: "Starter Website", kind: "AD_QUOTE", amount: 500, provider: "zip" }));
    expect(q).toContain('"Starter Website"');
    expect(q).toContain("$500.00");
    expect(q).toContain("website package");
    expect(q).toContain("Zip");
    expect(q).toContain("20 Oct 2026");
  });
});
