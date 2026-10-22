"use client";

import { useState } from "react";

/**
 * Matches the Easylink Designer "Orders & invoices" mock (DistOrders.dc.html) —
 * one SO number across your own orders, the kit linked installers order against
 * your jobs, and customer shop orders you fulfil.
 *
 * Sample data: this app has no ordering system. The filtering and the approval
 * are the mock's own live behaviour — approving SO-48240 moves it out of
 * "Awaiting your approval" and into the warehouse, in both the table row and
 * the card, because that is the point of the control.
 */

const INK = "#0F172A";
const SUN = "#F68A0A";
const SUN_INK = "#3B1D00";
/** The row awaiting a decision is tinted so it reads as the one to act on. */
const CREAM = "#FFF7E6";

const TH = "border-b border-[#E3E8EF] p-2 text-left text-[13px] font-semibold text-[#475569]";
const TD = "border-b border-[#EEF2F6] px-2 py-2.5 text-[13px]";
const NUM = "text-right tabular-nums";

/** [label, background, foreground] */
const STATUS = {
  ap: ["Awaiting your approval", "#FFE7C2", SUN_INK],
  pr: ["Processing", "#E2E8F0", "#334155"],
  pk: ["Picking", "#FEF3C7", "#92400E"],
  tr: ["In transit", "#DBEAFE", "#1E40AF"],
  dl: ["Delivered", "#DCFCE7", "#166534"],
  ov: ["Invoice overdue", "#FEE2E2", "#991B1B"],
} as const;

type StatusKey = keyof typeof STATUS;

/** Who placed the order: [label, background, foreground] */
const PLACED_BY = {
  you: ["You", "#F1F5F9", "#334155"],
  inst: ["Solarman", "#FFE7C2", SUN_INK],
  cust: ["Customer · shop", "#DBEAFE", "#1E40AF"],
} as const;

type PlacedBy = keyof typeof PLACED_BY;

type Order = {
  id: string;
  date: string;
  job: string;
  by: PlacedBy;
  ship: string;
  total: string;
  /** Omitted on the order awaiting approval, which follows the approval state. */
  status?: StatusKey;
  cream?: boolean;
};

const ORDERS: Order[] = [
  {
    id: "SO-48240",
    date: "11 Oct",
    job: "JOB-3138 Blacktown · 10.56 kW",
    by: "inst",
    ship: "Site",
    total: "$9,860.00",
    cream: true,
  },
  {
    id: "SO-48251",
    date: "11 Oct",
    job: "Customer shop · BLUETTI AC180",
    by: "cust",
    ship: "Courier to customer",
    total: "$1,098.90",
    status: "pk",
  },
  {
    id: "SO-48230",
    date: "10 Oct",
    job: "Stock · batteries",
    by: "you",
    ship: "Warehouse pickup",
    total: "$22,680.00",
    status: "pr",
  },
  {
    id: "SO-48211",
    date: "9 Oct",
    job: "Karen Whitfield · Castle Hill",
    by: "you",
    ship: "Site",
    total: "$18,940.00",
    status: "pk",
  },
  {
    id: "SO-48177",
    date: "6 Oct",
    job: "JOB-3127 Kellyville · 6.6 kW",
    by: "you",
    ship: "Site",
    total: "$7,215.50",
    status: "tr",
  },
  {
    id: "SO-48166",
    date: "5 Oct",
    job: "JOB-3131 Rouse Hill · 8 kW",
    by: "you",
    ship: "Site",
    total: "$9,104.00",
    status: "tr",
  },
  {
    id: "SO-48102",
    date: "1 Oct",
    job: "Stock order",
    by: "you",
    ship: "Your warehouse",
    total: "$41,860.00",
    status: "dl",
  },
  {
    id: "SO-48054",
    date: "26 Sep",
    job: "Parramatta · BLUETTI backup",
    by: "you",
    ship: "Courier",
    total: "$6,300.00",
    status: "ov",
  },
];

const FILTERS: [PlacedBy | "all", string][] = [
  ["all", "All"],
  ["you", "Placed by you"],
  ["inst", "Placed by installers"],
  ["cust", "Customer shop"],
];

/** The kit on the order awaiting approval. */
const LINES: [string, string, number][] = [
  ["AXITEC AC-440TGB/108BBA · 440 W", "PNL-AX440", 24],
  ["FOXESS 1K5-1P-HI-9.9 hybrid inverter", "INV-FX99", 1],
  ["Tile roof racking kit", "RCK-T24", 1],
  ["DC isolator and cabling pack", "BOS-DC2", 1],
];

function Pill({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span
      className="inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-bold"
      style={{ background: bg, color: fg }}
    >
      {label}
    </span>
  );
}

export function MasterDistOrders() {
  const [filter, setFilter] = useState<PlacedBy | "all">("all");
  const [approved, setApproved] = useState(false);

  // Approving sends the order to the warehouse, so it picks up the same
  // status everywhere it appears.
  const pendingKey: StatusKey = approved ? "pk" : "ap";
  const visible = ORDERS.filter((o) => filter === "all" || o.by === filter);

  return (
    <div className="flex min-h-full flex-col text-[#0F172A]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          Supply &amp; ordering <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Orders &amp; Invoices</span>
        </nav>
        <span className="rounded-full bg-[#DBEAFE] px-2.5 py-[3px] text-[12px] font-bold text-[#1E40AF]">
          Sample data
        </span>
      </header>

      <div className="flex w-full max-w-[1400px] flex-col gap-[18px] px-8 pb-14 pt-6">
        <div className="flex flex-wrap items-end gap-3.5">
          <div className="min-w-0 flex-grow">
            <h1 className="m-0 font-source-sans text-[28px] font-bold">Orders &amp; invoices</h1>
            <p className="mb-0 mt-1 text-[13px] text-[#5B6B80]">
              Your orders, kit your linked installers order for your jobs, and customer shop orders
              you fulfil · one SO number everywhere
            </p>
          </div>
          <div role="group" aria-label="Ordered by" className="flex gap-1.5">
            {FILTERS.map(([key, label]) => {
              const on = key === filter;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter(key)}
                  className="h-[38px] cursor-pointer whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold"
                  style={{
                    border: `1px solid ${on ? "#0B1A2E" : "#CBD5E1"}`,
                    background: on ? "#0B1A2E" : "#FFFFFF",
                    color: on ? "#FFFFFF" : INK,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <section
          aria-label="Orders"
          className="flex flex-col gap-2.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr>
                  <th className={TH}>Order</th>
                  <th className={TH}>Date</th>
                  <th className={TH}>Job</th>
                  <th className={TH}>Ordered by</th>
                  <th className={TH}>Deliver to</th>
                  <th className={`${TH} text-right`}>Total inc GST</th>
                  <th className={TH}>Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((o) => {
                  const [byLabel, byBg, byFg] = PLACED_BY[o.by];
                  const [sLabel, sBg, sFg] = STATUS[o.status ?? pendingKey];
                  return (
                    <tr key={o.id} style={{ background: o.cream ? CREAM : "#FFFFFF" }}>
                      <td className={`${TD} font-bold`}>{o.id}</td>
                      <td className={TD}>{o.date}</td>
                      <td className={TD}>{o.job}</td>
                      <td className={TD}>
                        <Pill label={byLabel} bg={byBg} fg={byFg} />
                      </td>
                      <td className={TD}>{o.ship}</td>
                      <td className={`${TD} ${NUM}`}>{o.total}</td>
                      <td className={TD}>
                        <Pill label={sLabel} bg={sBg} fg={sFg} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section
          aria-label="Order from installer"
          className="flex flex-col gap-3 rounded-[14px] bg-white p-[18px]"
          style={{ border: `2px solid ${SUN}` }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 flex-grow text-[18px] font-bold">
              SO-48240 · from Solarman for JOB-3138 Blacktown
            </h2>
            <span
              className="whitespace-nowrap rounded-full px-2.5 py-[3px] text-[12px] font-bold"
              style={{ background: STATUS[pendingKey][1], color: STATUS[pendingKey][2] }}
            >
              {STATUS[pendingKey][0]}
            </span>
          </div>
          <span className="text-[13px] text-[#475569]">
            Placed by Emmanuel in Equipment · billed to your account at your price · delivered to
            site Thu 16 Oct
          </span>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr>
                  <th className={TH}>Item</th>
                  <th className={TH}>SKU</th>
                  <th className={`${TH} text-right`}>Qty</th>
                  <th className={TH}>Matches design</th>
                </tr>
              </thead>
              <tbody>
                {LINES.map(([item, sku, qty]) => (
                  <tr key={sku}>
                    <td className={`${TD} font-semibold`}>{item}</td>
                    <td className={TD}>
                      <code>{sku}</code>
                    </td>
                    <td className={`${TD} ${NUM}`}>{qty}</td>
                    <td className={`${TD} font-semibold text-[#166534]`}>&#10003; Yes</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex-grow text-[13px] text-[#475569]">
              Installer orders over $5,000 need your approval. Change this in Installer trade
              accounts.
            </span>
            <button
              type="button"
              onClick={() => setApproved(true)}
              disabled={approved}
              className="h-11 cursor-pointer whitespace-nowrap rounded-[10px] border-0 px-5 text-[14px] font-bold disabled:cursor-default disabled:opacity-60"
              style={{ background: SUN, color: SUN_INK }}
            >
              {approved ? "Approved" : "Approve order"}
            </button>
            <button
              type="button"
              title="Not built yet"
              className="h-11 cursor-help whitespace-nowrap rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-[14px] font-semibold text-[#0F172A]"
            >
              Query with installer
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
