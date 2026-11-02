"use client";

import { useCallback, useEffect, useState } from "react";
import classNames from "classnames";
import { CustomerDashboardHeader } from "@/components/customer/dashboard/CustomerDashboardHeader";
import {
  CUSTOMER_PAYMENT_STATUS_LABELS,
  fetchCustomerPayments,
  formatPaymentAmount,
  type CustomerPayment,
  type PaymentStatus,
} from "@/lib/customers/payments";
import { useAppSelector } from "@/lib/store/hooks";
import { MyOrders } from "@/components/cart/MyOrders";

const STATUS_STYLES: Record<PaymentStatus, string> = {
  PAID: "bg-emerald-500/10 text-emerald-700",
  PENDING: "bg-amber-500/10 text-amber-700",
  FAILED: "bg-danger/10 text-danger",
  CANCELLED: "bg-warm-black/5 text-warm-gray",
  REFUNDED: "bg-brand-blue/10 text-brand-blue",
};

const KIND_LABEL: Record<CustomerPayment["kind"], string> = {
  SERVICE: "Installer service",
  PRODUCT_ORDER: "Product order",
};

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

export function CustomerPaymentsPageView() {
  const user = useAppSelector((s) => s.customerAuth.user);
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal: { cancelled: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCustomerPayments({ limit: 100 });
      if (!signal.cancelled) setPayments(data);
    } catch (err) {
      if (!signal.cancelled) {
        setError(err instanceof Error ? err.message : "Could not load your payments");
      }
    } finally {
      if (!signal.cancelled) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const signal = { cancelled: false };
    void load(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [load]);

  return (
    <div className="customer-page-bg flex min-h-screen flex-col">
      <CustomerDashboardHeader
        firstName={user?.firstName}
        lastName={user?.lastName}
        activeNav="payments"
      />

      <main className="mx-auto flex w-full max-w-[1024px] flex-1 flex-col gap-5 px-4 py-6 md:px-6">
        <div>
          <h1 className="font-inter text-lg font-bold customer-text-on-dark">
            Payment History
          </h1>
          <p className="mt-1 font-dm-sans text-sm customer-text-muted">
            Every payment linked to your account — products you&apos;ve bought
            directly, and any charge from your installer.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-warm-border bg-white px-6 py-12 text-center">
            <p className="font-dm-sans text-sm text-warm-gray">Loading your payments…</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-dashed border-danger/30 bg-danger/5 px-6 py-12 text-center">
            <p className="font-inter text-sm font-semibold text-danger">
              Could not load your payments
            </p>
            <p className="mt-1 font-dm-sans text-xs text-warm-gray">{error}</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-warm-border bg-white px-6 py-12 text-center">
            <p className="font-inter text-sm font-semibold text-warm-ink">
              No payments yet
            </p>
            <p className="mt-1 font-dm-sans text-xs text-warm-gray">
              Anything you buy from the Products page, or pay your installer,
              will show up here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-warm-border bg-white">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="border-b border-warm-border bg-cream-50 text-left">
                  {["Description", "Type", "Amount", "Status", "Date", ""].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-2.5 font-dm-sans text-[11px] font-semibold uppercase tracking-wide text-warm-gray"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-warm-border last:border-0">
                    <td className="px-4 py-3 font-dm-sans text-sm font-medium text-warm-ink">
                      {payment.description}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-cream-50 px-2 py-0.5 font-dm-sans text-[11px] font-semibold text-warm-ink">
                        {KIND_LABEL[payment.kind]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-dm-sans text-sm font-semibold text-warm-ink">
                      {formatPaymentAmount(payment)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={classNames(
                          "rounded-full px-2 py-0.5 font-dm-sans text-[10px] font-semibold uppercase tracking-wide",
                          STATUS_STYLES[payment.status],
                        )}
                      >
                        {CUSTOMER_PAYMENT_STATUS_LABELS[payment.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-dm-sans text-xs text-warm-gray">
                      {formatDate(payment.paidAt ?? payment.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {payment.receiptUrl ? (
                        <a
                          href={payment.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-dm-sans text-xs font-semibold text-brand-blue underline"
                        >
                          Receipt
                        </a>
                      ) : (
                        <span className="font-dm-sans text-xs text-warm-gray">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="rounded-2xl border border-warm-border bg-cream-50 p-4">
          <MyOrders portal="customer" />
        </div>
      </main>
    </div>
  );
}
