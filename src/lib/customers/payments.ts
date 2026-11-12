import { fetchWithCustomerSession } from "@/lib/customers/customer-fetch-client";

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED";

/**
 * Mirrors the backend's PaymentKind enum. AD_QUOTE is a fixed-price website
 * package bought from the pricing cards; it lands on a customer's history when
 * they bought it signed in. QUOTE_DEPOSIT is the deposit on an accepted quote.
 */
export type PaymentKind = "SERVICE" | "PRODUCT_ORDER" | "AD_QUOTE" | "QUOTE_DEPOSIT";

export type CustomerPayment = {
  id: string;
  provider: string;
  installerId: string | null;
  customerId: string | null;
  status: PaymentStatus;
  amount: number;
  amountRefunded: number;
  amountMinor: number;
  currency: string;
  description: string;
  customerEmail: string;
  customerName: string;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  receiptUrl: string | null;
  failureMessage: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  kind: PaymentKind;
  productId: string | null;
  quantity: number | null;
};

export type ProductCheckoutSession = {
  checkoutUrl: string;
  sessionId: string;
  payment: CustomerPayment;
};

async function readEnvelope<T>(res: Response, fallback: string): Promise<T> {
  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!res.ok) {
    throw new Error(json.message || fallback);
  }
  if (json.data === undefined) {
    throw new Error(json.message || fallback);
  }
  return json.data;
}

/** Starts a Stripe Checkout for buying one catalogue product directly. */
export async function createProductCheckout(input: {
  productId: string;
  quantity: number;
  /**
   * "afterpay" and "zip" redirect to those providers directly, on our own
   * merchant accounts; anything else goes via Stripe.
   */
  paymentMethod?: "auto" | "card" | "afterpay" | "zip";
}): Promise<ProductCheckoutSession> {
  const res = await fetchWithCustomerSession(
    "/api/customers/payments/products/checkout",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  const data = await readEnvelope<ProductCheckoutSession>(
    res,
    "Could not start checkout",
  );
  if (!data.checkoutUrl) {
    throw new Error("Invalid checkout response");
  }
  return data;
}

/**
 * Pulls the latest state from Stripe. Useful right after the checkout
 * redirect, when the webhook may not have landed yet.
 */
export async function refreshCustomerPayment(
  paymentId: string,
): Promise<CustomerPayment> {
  const res = await fetchWithCustomerSession(
    `/api/customers/payments/${encodeURIComponent(paymentId)}/refresh`,
    { method: "POST" },
  );
  return readEnvelope<CustomerPayment>(res, "Could not refresh payment");
}

/**
 * The signed-in customer's own payment history — product orders they've
 * bought directly, and any installer service charge billed to them.
 */
export async function fetchCustomerPayments(params?: {
  limit?: number;
}): Promise<CustomerPayment[]> {
  const sp = new URLSearchParams();
  if (params?.limit != null) sp.set("limit", String(params.limit));
  const qs = sp.toString();

  const res = await fetchWithCustomerSession(
    `/api/customers/payments${qs ? `?${qs}` : ""}`,
  );
  return readEnvelope<CustomerPayment[]>(res, "Could not load your payments");
}

export function formatPaymentAmount(payment: {
  amount: number;
  currency: string;
}): string {
  try {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: payment.currency,
    }).format(payment.amount);
  } catch {
    return `${payment.amount.toFixed(2)} ${payment.currency}`;
  }
}

export const CUSTOMER_PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Awaiting payment",
  PAID: "Paid",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};
