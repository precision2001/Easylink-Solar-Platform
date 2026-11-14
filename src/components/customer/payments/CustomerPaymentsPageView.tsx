"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { askEasylinkAi } from "@/components/ai-chat/EasylinkAiChatbot";
import { CustomerOrdersPanel } from "@/components/customer/payments/CustomerOrdersPanel";
import { PaymentsList } from "@/components/customer/payments/PaymentsList";
import { PaymentSchedulePanel } from "@/components/customer/payments/PaymentSchedulePanel";
import { usePayLaterOptions, waysToPayLabel } from "@/components/customer/payments/usePayLaterOptions";
import { PortalPageHeader } from "@/components/customer/portal/CustomerPortalShell";
import { CustomerTopNav } from "@/components/customer/portal/CustomerTopNav";
import { PortalIcon } from "@/components/customer/portal/PortalIcon";
import { ButtonLink, EmptyNote, Panel, Skeleton } from "@/components/customer/portal/PortalParts";
import {
  formatMoney,
  formatPaymentDate,
  paymentDate,
  paymentTitle,
  summarisePayments,
  type PaymentsSummary,
} from "@/lib/customers/payment-view";
import { fetchCustomerPayments, type CustomerPayment } from "@/lib/customers/payments";

export function CustomerPaymentsPageView() {
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
      if (!signal.cancelled) setError(err instanceof Error ? err.message : "Could not load your payments");
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

  // Newest first, by the date the customer cares about.
  const sorted = useMemo(() => [...payments].sort((a, b) => paymentDate(b).localeCompare(paymentDate(a))), [payments]);
  const summary = useMemo(() => summarisePayments(payments), [payments]);

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6FA] text-[#0F172A]">
  <CustomerTopNav active="payments" />
  <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-[18px] px-6 pt-6 pb-14">
      <PortalPageHeader
        eyebrow="Buy and pay"
        title="Payments"
        intro="Everything you've paid EasyLink or your installer, with receipts. Ask EasyLink AI about any line."
      />

      <PaymentSchedulePanel />

      <SummaryCard summary={summary} loading={loading} hasPayments={payments.length > 0} />

      <Panel title="Payment history" meta={!loading && !error && payments.length ? `${payments.length} ${payments.length === 1 ? "payment" : "payments"}, newest first` : undefined}>
        {loading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[64px]" />
            ))}
          </div>
        ) : error ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-[#FEE2E2] p-4">
            <div className="flex flex-col gap-0.5">
              <p className="m-0 text-[14.5px] font-bold text-[#991B1B]">We couldn&apos;t load your payments</p>
              <p className="m-0 text-[13.5px] text-[#7F1D1D]">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => void load({ cancelled: false })}
              className="min-h-[44px] rounded-[12px] border border-[#FCA5A5] bg-white px-4 text-[14px] font-bold text-[#991B1B] hover:border-[#991B1B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
            >
              Try again
            </button>
          </div>
        ) : payments.length === 0 ? (
          <EmptyNote icon="payments" title="No payments yet">
            When you buy products here or your installer bills you, the payment and its receipt show up on this page straight away.
          </EmptyNote>
        ) : (
          <PaymentsList payments={sorted} />
        )}
      </Panel>

      <CustomerOrdersPanel />
      </main>
    </div>
  );
}

/** The one bold card on this screen: what has been paid and what is still open. */
function SummaryCard({ summary, loading, hasPayments }: { summary: PaymentsSummary; loading: boolean; hasPayments: boolean }) {
  const pending = summary.pending[0];
  const { afterpay, zip } = usePayLaterOptions();
  return (
    <section aria-labelledby="pay-summary" className="relative overflow-hidden rounded-[22px] bg-[#0B1A2E] p-6 text-white sm:p-7">
      <svg aria-hidden="true" className="pointer-events-none absolute -right-14 -top-16 h-[220px] w-[220px] text-[#F68A0A] opacity-[0.14]" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="34" fill="currentColor" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * Math.PI) / 6;
          return <line key={i} x1={r2(100 + Math.cos(a) * 50)} y1={r2(100 + Math.sin(a) * 50)} x2={r2(100 + Math.cos(a) * 82)} y2={r2(100 + Math.sin(a) * 82)} stroke="currentColor" strokeWidth="8" strokeLinecap="round" />;
        })}
      </svg>

      <div className="relative grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-end">
        <div className="flex flex-col gap-2">
          <p className="m-0 flex items-center gap-2 text-[13px] font-bold text-[#FFE866]">
            <PortalIcon name="dollar" size={16} />
            Total paid
          </p>
          {loading ? (
            <Skeleton className="h-14 w-56 bg-white/10" />
          ) : (
            <>
              <h2 id="pay-summary" className="m-0 font-source-sans text-[40px] font-extrabold leading-[1.05] tabular-nums sm:text-[48px]">
                {formatMoney(summary.totalPaid, summary.currency)}
              </h2>
              <p className="m-0 text-[14.5px] leading-[1.5] text-[#C9D6EA]">
                {summary.paidCount > 0
                  ? `Across ${summary.paidCount} ${summary.paidCount === 1 ? "payment" : "payments"}, incl. GST${summary.refunded > 0 ? `, after ${formatMoney(summary.refunded, summary.currency)} refunded` : ""}.`
                  : "Nothing paid yet. Payments show here as soon as you check out."}
              </p>
            </>
          )}
          <div className="mt-2 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() =>
                askEasylinkAi(
                  hasPayments
                    ? `Summarise my payments: ${formatMoney(summary.totalPaid, summary.currency)} paid so far${summary.pendingTotal > 0 ? ` and ${formatMoney(summary.pendingTotal, summary.currency)} awaiting payment` : ""}. What's left to pay for my solar?`
                    : "How do payments work with EasyLink, and when would I pay a deposit?",
                )
              }
              className="inline-flex min-h-[46px] items-center gap-2 rounded-[13px] bg-[#F68A0A] px-[18px] text-[14.5px] font-bold text-[#3B1D00] hover:bg-[#FF9A1F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFE866]"
            >
              <PortalIcon name="spark" size={18} />
              {hasPayments ? "Ask AI about my payments" : "How payments work"}
            </button>
            <ButtonLink href="/customers/products" variant="ghost-dark">
              Shop products
            </ButtonLink>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1 rounded-[16px] bg-white/[0.07] p-4">
            <span className="text-[13px] text-[#C9D6EA]">Awaiting payment</span>
            {loading ? (
              <Skeleton className="h-7 w-24 bg-white/10" />
            ) : pending ? (
              <>
                <span className="text-[22px] font-extrabold tabular-nums text-[#FFE866]">{formatMoney(summary.pendingTotal, summary.currency)}</span>
                <span className="text-[13px] leading-[1.45] text-[#C9D6EA]">
                  {summary.pending.length > 1 ? `${summary.pending.length} payments, latest ` : ""}
                  {paymentTitle(pending)}, started {formatPaymentDate(paymentDate(pending))}. Just paid? It can take a minute to confirm.
                </span>
              </>
            ) : (
              <>
                <span className="text-[22px] font-extrabold text-white">Nothing</span>
                <span className="text-[13px] leading-[1.45] text-[#C9D6EA]">You&apos;re all paid up.</span>
              </>
            )}
          </div>
          <div className="flex flex-col gap-1 rounded-[16px] bg-white/[0.07] p-4">
            <span className="text-[13px] text-[#C9D6EA]">Ways to pay</span>
            <span className="text-[17px] font-bold leading-[1.3] text-white">{waysToPayLabel(afterpay, zip)}</span>
            <span className="text-[13px] leading-[1.45] text-[#C9D6EA]">
              {afterpay?.configured || zip?.configured
                ? "Cards go through Stripe. Pay-later options show at checkout when your order fits their limits."
                : "Cards go through Stripe, and you get an emailed receipt."}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Rounded so server and browser render identical SVG coordinates (no hydration mismatch). */
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}
