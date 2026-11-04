import { fetchWithInstallerSession } from "@/lib/installers/installer-fetch-client";

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED";
export type PaymentKind = "SERVICE" | "PRODUCT_ORDER" | "AD_QUOTE";

export type MasterPayout = {
  id: string;
  amount: number;
  amountMinor: number;
  note: string | null;
  paidByUserId: string;
  paidAt: string;
};

export type MasterPayment = {
  id: string;
  provider: string;
  zipReceiptNumber: string | null;
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
  payoutStatus: "NOT_PAID_OUT" | "PAID_OUT";
  payout: MasterPayout | null;
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

/** All payments across the platform (customer product orders + installer service charges). */
export async function fetchAllPayments(filters?: {
  status?: PaymentStatus;
  kind?: PaymentKind;
  installerId?: string;
  limit?: number;
}): Promise<MasterPayment[]> {
  const sp = new URLSearchParams();
  if (filters?.status) sp.set("status", filters.status);
  if (filters?.kind) sp.set("kind", filters.kind);
  if (filters?.installerId) sp.set("installerId", filters.installerId);
  if (filters?.limit != null) sp.set("limit", String(filters.limit));
  const qs = sp.toString();

  const res = await fetchWithInstallerSession(
    `/api/admin/payments${qs ? `?${qs}` : ""}`,
  );
  return readEnvelope<MasterPayment[]>(res, "Could not load payments");
}

/** Refunds a direct Afterpay or Zip payment. Omit `amount` for the full balance. */
export async function refundPayment(
  id: string,
  input: { amount?: number; reason: string },
): Promise<MasterPayment> {
  const res = await fetchWithInstallerSession(`/api/admin/payments/${encodeURIComponent(id)}/refund`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readEnvelope<MasterPayment>(res, "Could not refund this payment");
}

/** Marks a paid SERVICE payment as paid out to its installer (manual/ledger payout). */
export async function markPaymentPaidOut(
  paymentId: string,
  note?: string,
): Promise<MasterPayment> {
  const res = await fetchWithInstallerSession(
    `/api/admin/payments/${encodeURIComponent(paymentId)}/payout`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(note ? { note } : {}),
    },
  );
  return readEnvelope<MasterPayment>(res, "Could not mark payment as paid out");
}
