"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchMasterOverviewAnalytics,
  type MasterOverviewAnalytics,
} from "@/lib/admin/analytics";
import {
  fetchAllPayments,
  type MasterPayment,
  type PaymentStatus,
} from "@/lib/admin/payments";

const STATUS_STYLE: Record<PaymentStatus, { bg: string; fg: string; label: string }> = {
  PAID: { bg: "#DCFCE7", fg: "#166534", label: "Paid" },
  PENDING: { bg: "#FEF3C7", fg: "#92400E", label: "Pending" },
  FAILED: { bg: "#FEE2E2", fg: "#991B1B", label: "Failed" },
  CANCELLED: { bg: "#F1F5F9", fg: "#475569", label: "Cancelled" },
  REFUNDED: { bg: "#DBEAFE", fg: "#1E40AF", label: "Refunded" },
};

function formatAud(amount: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}

function KpiCard({
  label,
  value,
  sub,
  subColor,
}: {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[14px] border border-[#E3E8EF] bg-white p-4">
      <span className="text-[12px] font-semibold text-[#5B6B80]">{label}</span>
      <span className="font-source-sans text-[28px] font-bold text-[#0F172A]">
        {value}
      </span>
      {sub ? (
        <span
          className="text-[12px] font-semibold"
          style={{ color: subColor ?? "#475569" }}
        >
          {sub}
        </span>
      ) : null}
    </div>
  );
}

function ComingSoonCard({ title, note }: { title: string; note: string }) {
  return (
    <section className="flex flex-col gap-2 rounded-[14px] border border-dashed border-[#CBD5E1] bg-white p-[18px]">
      <div className="flex items-center justify-between">
        <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">{title}</h2>
        <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-bold text-[#64748B]">
          Coming soon
        </span>
      </div>
      <p className="m-0 text-[13px] leading-[20px] text-[#5B6B80]">{note}</p>
    </section>
  );
}

export function MasterDistOverview() {
  const [analytics, setAnalytics] = useState<MasterOverviewAnalytics | null>(
    null,
  );
  const [payments, setPayments] = useState<MasterPayment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchMasterOverviewAnalytics(),
      fetchAllPayments({ limit: 5 }),
    ])
      .then(([a, p]) => {
        if (cancelled) return;
        setAnalytics(a);
        setPayments(p);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load dashboard");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const kpis = analytics?.kpis;
  const invoiceOpenIsZero = kpis?.invoiceOpen?.replace(/[^\d]/g, "") === "0";

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav
          aria-label="Breadcrumb"
          className="flex-grow text-[13px] text-[#5B6B80]"
        >
          Distributor Account{" "}
          <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Overview</span>
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-[18px] px-8 py-6 pb-14">
        <div className="flex flex-wrap items-end gap-3.5">
          <div className="flex-grow">
            <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
              Overview
            </h1>
            <p className="mt-1 text-[13px] text-[#5B6B80]">
              Sales, invoices and your installer network at a glance.
            </p>
          </div>
        </div>

        {error ? (
          <div className="rounded-[14px] border border-red-200 bg-white p-6 text-[14px] text-red-700">
            {error}
          </div>
        ) : !analytics || !payments ? (
          <div className="h-[420px] animate-pulse rounded-[14px] bg-[#E3E8EF]" />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Active installers"
                value={String(kpis?.installers ?? 0)}
                sub={`${kpis?.customers ?? 0} customers`}
              />
              <KpiCard
                label="Total leads"
                value={String(kpis?.totalLeads ?? 0)}
                sub={`${kpis?.wonLeads ?? 0} won · ${kpis?.conversionRate ?? 0}% conversion`}
                subColor="#166534"
              />
              <KpiCard
                label="Invoiced (all time)"
                value={kpis?.invoiceTotal ?? "$0"}
              />
              <KpiCard
                label="Invoices outstanding"
                value={kpis?.invoiceOpen ?? "$0"}
                sub={invoiceOpenIsZero ? "All settled" : "Awaiting payment"}
                subColor={invoiceOpenIsZero ? "#166534" : "#92400E"}
              />
            </div>

            <ComingSoonCard
              title="Installer network"
              note="Dispatching jobs to a network of installers, handover review and installer payouts aren't built yet — this app currently connects each installer directly with their own customers."
            />

            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
              <section className="flex flex-col gap-2.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]">
                <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">
                  Needs your attention
                </h2>
                {invoiceOpenIsZero ? (
                  <p className="m-0 text-[13px] text-[#5B6B80]">
                    Nothing needs attention right now.
                  </p>
                ) : (
                  <Link
                    href="/master/invoices"
                    className="flex items-center gap-3 rounded-xl bg-[#FEF2F2] p-3 no-underline"
                  >
                    <span className="size-2.5 shrink-0 rounded-full bg-[#B91C1C]" />
                    <span className="flex flex-grow flex-col gap-0.5">
                      <span className="text-[14px] font-semibold text-[#0F172A]">
                        Outstanding invoices: {kpis?.invoiceOpen}
                      </span>
                      <span className="text-[12px] text-[#475569]">
                        Review and follow up on unpaid invoices
                      </span>
                    </span>
                    <span className="flex h-9 shrink-0 items-center rounded-[9px] border border-[#CBD5E1] bg-white px-3.5 text-[13px] font-semibold text-[#0F172A]">
                      Review
                    </span>
                  </Link>
                )}
              </section>

              <ComingSoonCard
                title="Documents"
                note="Distributor agreement, insurance and accreditation tracking aren't wired up yet."
              />
            </div>

            <section className="flex flex-col gap-2.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]">
              <div className="flex items-center">
                <h2 className="m-0 flex-grow text-[16px] font-bold text-[#0F172A]">
                  Recent payments
                </h2>
                <Link
                  href="/master/payments"
                  className="text-[13px] font-semibold text-[#0F172A] no-underline"
                >
                  All payments
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-[13px]">
                  <thead>
                    <tr className="text-left text-[#475569]">
                      <th className="border-b border-[#E3E8EF] px-2 py-2 font-semibold">
                        Payment
                      </th>
                      <th className="border-b border-[#E3E8EF] px-2 py-2 font-semibold">
                        Customer
                      </th>
                      <th className="border-b border-[#E3E8EF] px-2 py-2 text-right font-semibold">
                        Amount
                      </th>
                      <th className="border-b border-[#E3E8EF] px-2 py-2 font-semibold">
                        Date
                      </th>
                      <th className="border-b border-[#E3E8EF] px-2 py-2 font-semibold">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-2 py-6 text-center text-[#5B6B80]"
                        >
                          No payments yet.
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => {
                        const s = STATUS_STYLE[p.status];
                        return (
                          <tr key={p.id}>
                            <td className="border-b border-[#EEF2F6] px-2 py-2.5 font-semibold">
                              {p.description || p.id.slice(0, 8)}
                            </td>
                            <td className="border-b border-[#EEF2F6] px-2 py-2.5">
                              {p.customerName || p.customerEmail || "—"}
                            </td>
                            <td className="border-b border-[#EEF2F6] px-2 py-2.5 text-right tabular-nums">
                              {formatAud(p.amount)}
                            </td>
                            <td className="border-b border-[#EEF2F6] px-2 py-2.5">
                              {formatDate(p.createdAt)}
                            </td>
                            <td className="border-b border-[#EEF2F6] px-2 py-2.5">
                              <span
                                className="rounded-full px-2 py-0.5 text-[12px] font-bold"
                                style={{ background: s.bg, color: s.fg }}
                              >
                                {s.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
