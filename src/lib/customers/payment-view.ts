import { formatPaymentAmount, type CustomerPayment, type PaymentStatus } from "@/lib/customers/payments";

/**
 * Display rules for the customer Payments screen. Pure, so the labels and
 * totals the customer sees are tested rather than eyeballed.
 */

const KIND_LABEL: Record<string, string> = {
  SERVICE: "Installer service",
  PRODUCT_ORDER: "Product order",
  AD_QUOTE: "Website package",
};

/** A readable label for every payment kind, including ones added later. */
export function paymentKindLabel(kind: string | null | undefined): string {
  if (!kind) return "Payment";
  const known = KIND_LABEL[kind];
  if (known) return known;
  const words = kind.replace(/[_-]+/g, " ").trim().toLowerCase();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Payment";
}

/** How the customer paid. The backend stores the provider in lower case. */
export function paymentMethodLabel(provider: string | null | undefined): string {
  switch ((provider ?? "").trim().toLowerCase()) {
    case "stripe":
      return "Card (Stripe)";
    case "afterpay":
      return "Afterpay";
    case "zip":
      return "Zip";
    case "":
      return "Card";
    default: {
      const p = (provider ?? "").trim();
      return p.charAt(0).toUpperCase() + p.slice(1);
    }
  }
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PAID: "Paid",
  PENDING: "Awaiting payment",
  FAILED: "Didn't go through",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export type StatusTone = "good" | "warn" | "bad" | "muted" | "info";

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, StatusTone> = {
  PAID: "good",
  PENDING: "warn",
  FAILED: "bad",
  CANCELLED: "muted",
  REFUNDED: "info",
};

/** The date that matters to the customer: when it was paid, else when it was started. */
export function paymentDate(p: Pick<CustomerPayment, "paidAt" | "createdAt">): string {
  return p.paidAt ?? p.createdAt;
}

export function formatPaymentDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Sydney" });
}

/** What the payment was for, falling back to its kind when the description is blank. */
export function paymentTitle(p: Pick<CustomerPayment, "description" | "kind">): string {
  return p.description?.trim() || paymentKindLabel(p.kind);
}

export type PaymentsSummary = {
  currency: string;
  /** Money that stayed paid: settled payments less anything refunded. */
  totalPaid: number;
  paidCount: number;
  refunded: number;
  /** Payments started but not yet settled, newest first. */
  pending: CustomerPayment[];
  pendingTotal: number;
};

/**
 * Totals for the summary card. Only payments in the main currency (that of the
 * newest payment, AUD in practice) are added, so mixed currencies never sum.
 */
export function summarisePayments(payments: CustomerPayment[]): PaymentsSummary {
  const sorted = [...payments].sort((a, b) => paymentDate(b).localeCompare(paymentDate(a)));
  const currency = (sorted[0]?.currency ?? "AUD").toUpperCase();
  const same = sorted.filter((p) => (p.currency ?? "").toUpperCase() === currency);

  let totalPaid = 0;
  let paidCount = 0;
  let refunded = 0;
  for (const p of same) {
    if (p.status !== "PAID" && p.status !== "REFUNDED") continue;
    // A full refund may arrive without amountRefunded filled in; treat it as all of it.
    const back = p.amountRefunded > 0 ? Math.min(p.amount, p.amountRefunded) : p.status === "REFUNDED" ? p.amount : 0;
    const kept = p.amount - back;
    refunded += back;
    totalPaid += kept;
    if (kept > 0) paidCount += 1;
  }
  const pending = same.filter((p) => p.status === "PENDING");
  const pendingTotal = pending.reduce((sum, p) => sum + p.amount, 0);
  return { currency, totalPaid: round2(totalPaid), paidCount, refunded: round2(refunded), pending, pendingTotal: round2(pendingTotal) };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatMoney(amount: number, currency = "AUD"): string {
  return formatPaymentAmount({ amount, currency });
}

/** The question handed to EasyLink AI from a payment row's "Explain this" action. */
export function explainPaymentQuestion(p: CustomerPayment): string {
  const parts = [
    `Explain this payment: "${paymentTitle(p)}"`,
    `${formatPaymentAmount(p)} (${paymentKindLabel(p.kind).toLowerCase()})`,
    `paid with ${paymentMethodLabel(p.provider)}`,
    `${p.paidAt ? "on" : "started on"} ${formatPaymentDate(paymentDate(p))}`,
    `status: ${PAYMENT_STATUS_LABEL[p.status] ?? p.status}`,
  ];
  if (p.amountRefunded > 0) parts.push(`${formatPaymentAmount({ amount: p.amountRefunded, currency: p.currency })} refunded`);
  return `${parts.join(", ")}. What was it for, and is there anything I need to do?`;
}
