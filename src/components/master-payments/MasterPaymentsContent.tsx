"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import classNames from "classnames";
import { toast } from "react-toastify";
import Icon from "@/components/ui/Icons";
import {
  fetchAllPayments,
  markPaymentPaidOut,
  refundPayment,
  type MasterPayment,
  type PaymentKind,
  type PaymentStatus,
} from "@/lib/admin/payments";

const STATUS_OPTIONS: { id: PaymentStatus | "all"; label: string }[] = [
  { id: "all", label: "All statuses" },
  { id: "PAID", label: "Paid" },
  { id: "PENDING", label: "Pending" },
  { id: "FAILED", label: "Failed" },
  { id: "CANCELLED", label: "Cancelled" },
  { id: "REFUNDED", label: "Refunded" },
];

const KIND_OPTIONS: { id: PaymentKind | "all"; label: string }[] = [
  { id: "all", label: "All kinds" },
  { id: "SERVICE", label: "Installer service" },
  { id: "PRODUCT_ORDER", label: "Product order" },
  { id: "AD_QUOTE", label: "Website quote" },
];

const KIND_LABEL: Record<PaymentKind, string> = {
  SERVICE: "Service",
  PRODUCT_ORDER: "Product order",
  AD_QUOTE: "Website quote",
};

const STATUS_STYLES: Record<PaymentStatus, string> = {
  PAID: "bg-emerald-500/10 text-emerald-700",
  PENDING: "bg-amber-500/10 text-amber-700",
  FAILED: "bg-danger/10 text-danger",
  CANCELLED: "bg-warm-black/5 text-warm-gray",
  REFUNDED: "bg-brand-blue/10 text-brand-blue",
};

function formatAmount(payment: { amount: number; currency: string }): string {
  try {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: payment.currency,
    }).format(payment.amount);
  } catch {
    return `${payment.amount.toFixed(2)} ${payment.currency}`;
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

type StatCard = { label: string; value: string; icon: "Dollar" | "Clock" | "CheckCircle" | "Package" };

function buildStatCards(payments: MasterPayment[]): StatCard[] {
  const paid = payments.filter((p) => p.status === "PAID");
  const totalRevenue = paid.reduce((sum, p) => sum + p.amount, 0);
  const currency = paid[0]?.currency ?? "AUD";
  const pendingPayouts = paid.filter(
    (p) => p.kind === "SERVICE" && p.payoutStatus === "NOT_PAID_OUT",
  );
  const pendingPayoutAmount = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);
  const productOrders = paid.filter((p) => p.kind === "PRODUCT_ORDER").length;
  const adQuotes = paid.filter((p) => p.kind === "AD_QUOTE").length;

  return [
    {
      label: "Total revenue received",
      value: formatAmount({ amount: totalRevenue, currency }),
      icon: "Dollar",
    },
    {
      label: "Awaiting installer payout",
      value: `${formatAmount({ amount: pendingPayoutAmount, currency })} (${pendingPayouts.length})`,
      icon: "Clock",
    },
    {
      label: "Product orders",
      value: String(productOrders),
      icon: "Package",
    },
    {
      label: "Service payments",
      value: String(paid.filter((p) => p.kind === "SERVICE").length),
      icon: "CheckCircle",
    },
    {
      label: "Website quotes",
      value: String(adQuotes),
      icon: "Package",
    },
  ];
}

const PROVIDER_LABEL: Record<string, string> = { stripe: "Card", afterpay: "Afterpay", zip: "Zip" };

export function MasterPaymentsContent() {
  const [payments, setPayments] = useState<MasterPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [kindFilter, setKindFilter] = useState<PaymentKind | "all">("all");
  const [search, setSearch] = useState("");
  const [payoutTarget, setPayoutTarget] = useState<MasterPayment | null>(null);
  const [payoutNote, setPayoutNote] = useState("");
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [refundTarget, setRefundTarget] = useState<MasterPayment | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  const load = useCallback(async (signal: { cancelled: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllPayments({
        status: statusFilter === "all" ? undefined : statusFilter,
        kind: kindFilter === "all" ? undefined : kindFilter,
        limit: 200,
      });
      if (!signal.cancelled) setPayments(data);
    } catch (err) {
      if (!signal.cancelled) {
        setError(err instanceof Error ? err.message : "Could not load payments");
      }
    } finally {
      if (!signal.cancelled) setLoading(false);
    }
  }, [statusFilter, kindFilter]);

  useEffect(() => {
    const signal = { cancelled: false };
    void load(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) =>
      `${p.customerName} ${p.customerEmail} ${p.description}`
        .toLowerCase()
        .includes(q),
    );
  }, [payments, search]);

  const statCards = useMemo(() => buildStatCards(payments), [payments]);

  async function confirmPayout() {
    if (!payoutTarget) return;
    setPayoutSubmitting(true);
    try {
      const updated = await markPaymentPaidOut(
        payoutTarget.id,
        payoutNote.trim() || undefined,
      );
      setPayments((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      toast.success("Marked as paid out.");
      setPayoutTarget(null);
      setPayoutNote("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not mark as paid out");
    } finally {
      setPayoutSubmitting(false);
    }
  }

  async function confirmRefund() {
    if (!refundTarget || !refundReason.trim()) return;
    const amount = refundAmount.trim() ? Number(refundAmount) : undefined;
    const remaining = refundTarget.amount - refundTarget.amountRefunded;
    if (amount !== undefined && (!Number.isFinite(amount) || amount <= 0 || amount > remaining)) {
      toast.error(`Enter an amount up to ${remaining.toFixed(2)}.`);
      return;
    }
    setRefundSubmitting(true);
    try {
      const updated = await refundPayment(refundTarget.id, { amount, reason: refundReason.trim() });
      setPayments((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      toast.success("Refund sent.");
      setRefundTarget(null);
      setRefundAmount("");
      setRefundReason("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not refund this payment");
    } finally {
      setRefundSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-5 py-6">
      <div>
        <h1 className="font-inter text-[20px] font-bold text-warm-ink">Payments</h1>
        <p className="mt-1 font-dm-sans text-sm text-warm-gray">
          Every payment across the platform by card, Afterpay and Zip — customer
          product orders and installer service charges. Refund Afterpay and Zip
          payments here so this list stays correct. Mark a paid service charge as &ldquo;paid
          out&rdquo; once you have transferred the installer&apos;s share.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-warm-border bg-white px-4 py-3.5 shadow-sm"
          >
            <div className="flex items-center gap-2 text-warm-gray">
              <Icon name={card.icon} className="size-4" />
              <span className="font-dm-sans text-[11px] font-semibold uppercase tracking-wide">
                {card.label}
              </span>
            </div>
            <p className="mt-1.5 font-inter text-[20px] font-bold text-warm-ink">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-warm-border bg-white p-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setStatusFilter(opt.id)}
              className={classNames(
                "rounded-full px-3 py-1.5 font-dm-sans text-xs font-semibold transition-colors",
                statusFilter === opt.id
                  ? "bg-warm-ink text-white"
                  : "bg-cream-50 text-warm-ink hover:bg-cream-150",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {KIND_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setKindFilter(opt.id)}
              className={classNames(
                "rounded-full border px-3 py-1.5 font-dm-sans text-xs font-semibold transition-colors",
                kindFilter === opt.id
                  ? "border-brand-blue bg-brand-blue/5 text-brand-blue"
                  : "border-warm-border bg-white text-warm-ink hover:bg-cream-50",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-64">
          <Icon
            name="Search"
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-warm-gray"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer or description"
            className="w-full rounded-lg border border-warm-border bg-cream-50 py-1.5 pl-8 pr-3 font-dm-sans text-sm text-warm-ink outline-none focus:border-brand-blue"
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-dashed border-warm-border bg-white px-6 py-12 text-center">
          <p className="font-dm-sans text-sm text-warm-gray">Loading payments…</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-dashed border-danger/30 bg-danger/5 px-6 py-12 text-center">
          <p className="font-inter text-sm font-semibold text-danger">
            Could not load payments
          </p>
          <p className="mt-1 font-dm-sans text-xs text-warm-gray">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-warm-border bg-white px-6 py-12 text-center">
          <p className="font-dm-sans text-sm text-warm-gray">No matching payments.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-warm-border bg-white">
          <table className="w-full min-w-[880px] border-collapse">
            <thead>
              <tr className="border-b border-warm-border bg-cream-50 text-left">
                {["Customer", "Installer", "Kind", "Paid with", "Amount", "Status", "Payout", "Date", ""].map(
                  (heading) => (
                    <th
                      key={heading}
                      className="px-4 py-2.5 font-dm-sans text-[11px] font-semibold uppercase tracking-wide text-warm-gray"
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((payment) => {
                const canMarkPayout =
                  payment.kind === "SERVICE" &&
                  payment.status === "PAID" &&
                  payment.payoutStatus === "NOT_PAID_OUT";
                return (
                  <tr key={payment.id} className="border-b border-warm-border last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-dm-sans text-sm font-semibold text-warm-ink">
                        {payment.customerName || "—"}
                      </p>
                      <p className="font-dm-sans text-xs text-warm-gray">
                        {payment.customerEmail}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-dm-sans text-sm text-warm-ink">
                      {payment.installerId ? payment.installerId.slice(0, 8) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-cream-50 px-2 py-0.5 font-dm-sans text-[11px] font-semibold text-warm-ink">
                        {KIND_LABEL[payment.kind]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-dm-sans text-sm text-warm-ink">
                      {PROVIDER_LABEL[payment.provider] ?? payment.provider}
                      {payment.zipReceiptNumber ? (
                        <div className="text-xs text-warm-gray">Receipt {payment.zipReceiptNumber}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-dm-sans text-sm font-semibold text-warm-ink">
                      {formatAmount(payment)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={classNames(
                          "rounded-full px-2 py-0.5 font-dm-sans text-[10px] font-semibold uppercase tracking-wide",
                          STATUS_STYLES[payment.status],
                        )}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {payment.kind === "SERVICE" ? (
                        <span
                          className={classNames(
                            "rounded-full px-2 py-0.5 font-dm-sans text-[10px] font-semibold uppercase tracking-wide",
                            payment.payoutStatus === "PAID_OUT"
                              ? "bg-emerald-500/10 text-emerald-700"
                              : "bg-warm-black/5 text-warm-gray",
                          )}
                        >
                          {payment.payoutStatus === "PAID_OUT" ? "Paid out" : "Awaiting"}
                        </span>
                      ) : (
                        <span className="font-dm-sans text-xs text-warm-gray">n/a</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-dm-sans text-xs text-warm-gray">
                      {formatDate(payment.paidAt ?? payment.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canMarkPayout ? (
                        <button
                          type="button"
                          onClick={() => setPayoutTarget(payment)}
                          className="rounded-lg border border-brand-blue px-3 py-1.5 font-dm-sans text-xs font-semibold text-brand-blue hover:bg-brand-blue/5"
                        >
                          Mark Paid Out
                        </button>
                      ) : null}
                      {(payment.provider === "afterpay" || payment.provider === "zip") && payment.status === "PAID" ? (
                        <button
                          type="button"
                          onClick={() => setRefundTarget(payment)}
                          className="ml-2 rounded-lg border border-warm-border px-3 py-1.5 font-dm-sans text-xs font-semibold text-warm-ink hover:bg-cream-50"
                        >
                          Refund
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {payoutTarget ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          role="presentation"
        >
          <button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-[rgba(47,47,47,0.67)] backdrop-blur-[1px]"
            onClick={() => {
              if (!payoutSubmitting) setPayoutTarget(null);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-[1] w-full max-w-[420px] rounded-xl border border-warm-border bg-white p-5 shadow-lg"
          >
            <h2 className="font-inter text-[15px] font-bold text-warm-ink">
              Mark payment as paid out?
            </h2>
            <p className="mt-1 font-dm-sans text-sm text-warm-gray">
              Confirms {formatAmount(payoutTarget)} has been transferred to the
              installer outside the payment provider (e.g. bank transfer). This only records the
              payout — it does not move money.
            </p>
            <label className="mt-3 block">
              <span className="mb-1.5 block font-dm-sans text-xs font-semibold uppercase tracking-wide text-warm-gray">
                Note (optional)
              </span>
              <input
                type="text"
                value={payoutNote}
                onChange={(e) => setPayoutNote(e.target.value)}
                maxLength={500}
                placeholder="e.g. Bank transfer ref #123"
                disabled={payoutSubmitting}
                className="w-full rounded-lg border border-warm-border bg-cream-50 px-3 py-2 font-dm-sans text-sm text-warm-ink outline-none focus:border-brand-blue"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPayoutTarget(null)}
                disabled={payoutSubmitting}
                className="rounded-lg border border-warm-border px-4 py-2 font-dm-sans text-sm font-medium text-warm-ink hover:bg-cream-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmPayout()}
                disabled={payoutSubmitting}
                className="rounded-lg bg-brand-blue px-4 py-2 font-dm-sans text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
              >
                {payoutSubmitting ? "Saving…" : "Confirm paid out"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {refundTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              if (!refundSubmitting) setRefundTarget(null);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Refund payment"
            className="relative z-[1] w-full max-w-[420px] rounded-xl border border-warm-border bg-white p-5 shadow-lg"
          >
            <h2 className="font-inter text-[15px] font-bold text-warm-ink">
              Refund {PROVIDER_LABEL[refundTarget.provider]} payment?
            </h2>
            <p className="mt-1 font-dm-sans text-sm text-warm-gray">
              This sends real money back to {refundTarget.customerName || refundTarget.customerEmail} and can&apos;t be undone.
              {" "}{formatAmount({ amount: refundTarget.amount - refundTarget.amountRefunded, currency: refundTarget.currency })} can be refunded.
            </p>
            <label className="mt-3 block">
              <span className="mb-1.5 block font-dm-sans text-xs font-semibold uppercase tracking-wide text-warm-gray">
                Amount (blank for the full balance)
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="w-full rounded-lg border border-warm-border bg-cream-50 px-3 py-2 font-dm-sans text-sm text-warm-ink outline-none focus:border-brand-blue"
              />
            </label>
            <label className="mt-3 block">
              <span className="mb-1.5 block font-dm-sans text-xs font-semibold uppercase tracking-wide text-warm-gray">
                Reason
              </span>
              <input
                type="text"
                maxLength={200}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full rounded-lg border border-warm-border bg-cream-50 px-3 py-2 font-dm-sans text-sm text-warm-ink outline-none focus:border-brand-blue"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRefundTarget(null)}
                disabled={refundSubmitting}
                className="rounded-lg border border-warm-border px-4 py-2 font-dm-sans text-sm font-medium text-warm-ink hover:bg-cream-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmRefund()}
                disabled={refundSubmitting || !refundReason.trim()}
                className="rounded-lg bg-brand-blue px-4 py-2 font-dm-sans text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
              >
                {refundSubmitting ? "Refunding…" : "Refund"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
