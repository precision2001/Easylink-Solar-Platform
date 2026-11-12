"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  INSTALLER_LEAD_STATUSES,
  fetchInstallerLeads,
  type InstallerLeadSummary,
} from "@/lib/installers/leads";
import {
  PAYMENT_STATUS_LABELS,
  fetchInstallerPayments,
  formatPaymentAmount,
  type InstallerPayment,
  type PaymentStatus,
} from "@/lib/installers/payments";

/**
 * Reports, matching the Easylink Designer artboard (Reports.dc.html): KPI
 * tiles over a customers-by-stage breakdown and a payments table.
 *
 * The artboard also shows "Lead to install" days and "Installs completed".
 * Leads carry no stage-transition history and nothing records an install as
 * finished, so those two tiles are left out rather than shown with invented
 * figures — the tiles here are the ones the lead and payment APIs can
 * actually answer.
 */

const STAGE_LABELS: Record<string, string> = {
  NEW: "New lead",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL_SENT: "Proposal sent",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

const STATUS_TONE: Record<PaymentStatus, { bg: string; fg: string }> = {
  PAID: { bg: "#DCFCE7", fg: "#166534" },
  PENDING: { bg: "#FEF3C7", fg: "#92400E" },
  FAILED: { bg: "#FEE2E2", fg: "#991B1B" },
  CANCELLED: { bg: "#E2E8F0", fg: "#334155" },
  REFUNDED: { bg: "#DBEAFE", fg: "#1E40AF" },
};

const PANEL = "rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]";

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className={`${PANEL} flex flex-col gap-1`}>
      <span className="text-[12px] font-semibold text-[#5B6B80]">{label}</span>
      <span className="font-source-sans text-[28px] font-bold text-[#0F172A]">
        {value}
      </span>
      <span className="text-[12px] font-semibold text-[#475569]">{sub}</span>
    </div>
  );
}

export function InstallerReports() {
  const [leads, setLeads] = useState<InstallerLeadSummary[] | null>(null);
  const [payments, setPayments] = useState<InstallerPayment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchInstallerLeads({ page: 1, limit: 100 }),
      fetchInstallerPayments({ limit: 20 }),
    ])
      .then(([leadResult, paymentResult]) => {
        if (cancelled) return;
        setLeads(leadResult.leads);
        setPayments(paymentResult);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load reports");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stages = useMemo(() => {
    const rows = INSTALLER_LEAD_STATUSES.map((status) => ({
      status,
      label: STAGE_LABELS[status] ?? status,
      count: (leads ?? []).filter((l) => l.status === status).length,
    }));
    const max = Math.max(1, ...rows.map((r) => r.count));
    return rows.map((r) => ({ ...r, width: Math.round((r.count / max) * 100) }));
  }, [leads]);

  const kpis = useMemo(() => {
    const all = leads ?? [];
    const won = all.filter((l) => l.status === "WON").length;
    const lost = all.filter((l) => l.status === "LOST").length;
    const closed = won + lost;
    const paid = (payments ?? []).filter((p) => p.status === "PAID");
    const paidTotal = paid.reduce((sum, p) => sum + p.amount, 0);

    return [
      {
        label: "Open leads",
        value: String(all.length - closed),
        sub: `${all.length} total · ${lost} lost`,
      },
      {
        label: "Won",
        value: String(won),
        sub: closed ? `${Math.round((won / closed) * 100)}% of closed leads` : "No closed leads yet",
      },
      {
        label: "Payments received",
        value: String(paid.length),
        sub: paid.length
          ? formatPaymentAmount({
              amount: paidTotal,
              currency: paid[0]?.currency ?? "AUD",
            })
          : "None yet",
      },
      {
        label: "Awaiting payment",
        value: String((payments ?? []).filter((p) => p.status === "PENDING").length),
        sub: "Pending checkout",
      },
    ];
  }, [leads, payments]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-white p-6 font-inter text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!leads || !payments) {
    return <div className="h-[420px] animate-pulse rounded-lg bg-cream-150" />;
  }

  return (
    <div className="flex w-full max-w-[1400px] flex-col gap-[18px]">
      <div>
        <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
          Reports
        </h1>
        <p className="mt-1 text-[13px] text-[#5B6B80]">
          Your leads and customer payments · charts and forecasts are on the{" "}
          <Link
            href="/installers/dashboard/sales"
            className="font-semibold text-[#1565C0]"
          >
            Sales dashboard
          </Link>
        </p>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Kpi key={k.label} label={k.label} value={k.value} sub={k.sub} />
        ))}
      </div>

      <div className="grid items-start gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(420px,100%),1fr))]">
        <section aria-label="Customers by stage" className={`${PANEL} flex flex-col gap-2.5`}>
          <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">
            Customers by stage
          </h2>
          {stages.map((s) => (
            <div key={s.status} className="flex items-center gap-2.5 text-[13px]">
              <span className="w-[140px] shrink-0 text-[#0F172A]">{s.label}</span>
              <span className="h-[22px] flex-grow overflow-hidden rounded-md bg-[#F1F5F9]">
                <span
                  className="block h-full rounded-md bg-[#1976D2]"
                  style={{ width: `${s.width}%` }}
                />
              </span>
              <strong className="w-6 text-right text-[#0F172A]">{s.count}</strong>
            </div>
          ))}
          <span className="text-[12px] text-[#475569]">
            Open the{" "}
            <Link
              href="/installers/dashboard/pipeline-status"
              className="font-semibold text-[#1565C0]"
            >
              Pipeline
            </Link>{" "}
            to move customers between stages.
          </span>
        </section>

        <section
          aria-label="Customer invoices and payments"
          className={`${PANEL} flex flex-col gap-2.5`}
        >
          <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">
            Customer invoices &amp; payments
          </h2>
          {!payments.length ? (
            <p className="m-0 text-[13px] text-[#5B6B80]">No payments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[460px] border-collapse text-[13px]">
                <thead>
                  <tr className="text-left text-[#475569]">
                    <th className="border-b border-[#E3E8EF] p-2 font-semibold">
                      Customer
                    </th>
                    <th className="border-b border-[#E3E8EF] p-2 font-semibold">Type</th>
                    <th className="border-b border-[#E3E8EF] p-2 text-right font-semibold">
                      Amount
                    </th>
                    <th className="border-b border-[#E3E8EF] p-2 font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => {
                    const tone = STATUS_TONE[p.status];
                    return (
                      <tr key={p.id}>
                        <td className="border-b border-[#EEF2F6] p-2.5 font-semibold text-[#0F172A]">
                          {p.customerName || p.customerEmail || "—"}
                        </td>
                        <td className="border-b border-[#EEF2F6] p-2.5 text-[#475569]">
                          {p.description || (p.kind === "PRODUCT_ORDER" ? "Product order" : "Service")}
                        </td>
                        <td className="border-b border-[#EEF2F6] p-2.5 text-right text-[#0F172A]">
                          {formatPaymentAmount(p)}
                        </td>
                        <td className="border-b border-[#EEF2F6] p-2.5">
                          <span
                            className="rounded-full px-2 py-0.5 text-[12px] font-bold"
                            style={{ background: tone.bg, color: tone.fg }}
                          >
                            {PAYMENT_STATUS_LABELS[p.status]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <span className="text-[12px] text-[#475569]">
            EasyLink jobs are paid to you by RCTI, so they don&apos;t appear here.
          </span>
        </section>
      </div>
    </div>
  );
}
