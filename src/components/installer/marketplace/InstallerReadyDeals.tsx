"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

/**
 * Matches the Easylink Designer "Ready Deals" mock (InstReadyDeals.dc.html):
 * the installer's own promotions, the builder that creates them, and the
 * orders they produce.
 *
 * Like Ready Sites, there is no marketplace model in this app — no deals,
 * deal orders, website publishing or deposit custody — so the seed deals,
 * the equipment catalogue and the orders are the mock's sample data. The
 * behaviour is the mock's own logic ported rather than faked: the builder's
 * STC rebate, suggested price and margin all recompute from the equipment
 * picked, the CEC 133% and three-phase warnings fire on the same thresholds,
 * and saving really adds the record to the list.
 *
 * Nothing leaves this component. "Publish to website" does not publish, no
 * customer is created when an order is marked done, and every change is lost
 * on reload — the page says so rather than implying otherwise.
 */

const money = (n: number) => "$" + Math.round(Number(n) || 0).toLocaleString("en-AU");

type CatItem = {
  n: string;
  sku: string;
  cat: string;
  price: number;
  kwh?: number;
  sponsored?: boolean;
};

/** The mock's own catalogue, so the builder's figures reconcile with it. */
const CAT: Record<string, CatItem> = {
  pnl: { n: "AXITEC 440 W panel", sku: "PNL-AX440", cat: "Panel", price: 280, sponsored: true },
  s5: { n: "5 kW inverter", sku: "INV-S5", cat: "Inverter", price: 1600 },
  fx99: { n: "9.9 kW hybrid inverter", sku: "INV-FX99", cat: "Inverter", price: 3200, sponsored: true },
  b100: { n: "10 kWh battery", sku: "BAT-100S", cat: "Battery", price: 8000, kwh: 10, sponsored: true },
  fx4660: { n: "32.6 kWh FOX ESS battery", sku: "BAT-FX4660", cat: "Battery", price: 24000, kwh: 32.6, sponsored: true },
  ev: { n: "zappi 7 kW EV charger", sku: "EV-ZAPPI7", cat: "EV charger", price: 2200, sponsored: true },
  hp: { n: "Reclaim 270 L heat pump", sku: "HP-RECLAIM270", cat: "Heat pump", price: 3900, sponsored: true },
  blu: { n: "BLUETTI AC180 portable power", sku: "BLU-AC180", cat: "Portable", price: 1099 },
};

type PresetKey = "single" | "multi" | "solar" | "battery" | "solarbat" | "all";

const PRESETS: Record<PresetKey, { q: Record<string, number>; label: string; d: string }> = {
  single: { q: { ev: 1 }, label: "Single item", d: "One product, e.g. an EV charger" },
  multi: { q: { ev: 1, hp: 1 }, label: "Equipment bundle", d: "Two or more products" },
  solar: { q: { pnl: 15, s5: 1 }, label: "Solar system", d: "Panels + inverter" },
  battery: { q: { fx99: 1, b100: 1 }, label: "Battery", d: "Battery (+ hybrid inverter)" },
  solarbat: { q: { pnl: 23, fx99: 1, b100: 1 }, label: "Solar + battery", d: "The full home system" },
  all: { q: { pnl: 29, fx99: 1, b100: 2, ev: 1, hp: 1 }, label: "Everything", d: "Solar, battery, EV + hot water" },
};

type Deal = {
  id: string;
  title: string;
  type: string;
  equip: string;
  price: number;
  was: number;
  status: "Live" | "Draft" | "Paused" | "Ended";
  until: string;
  views: number;
  sold: number;
  limit: number;
};

const SEED_DEALS: Deal[] = [
  { id: "D-301", title: "6.6 kW Solar Starter", type: "Solar system", equip: "15 × AXITEC 440 W · 5 kW inverter", price: 5490, was: 6290, status: "Live", until: "Ends 24 Dec", views: 412, sold: 7, limit: 20 },
  { id: "D-302", title: "10 kW Solar + 10 kWh Battery", type: "Solar + battery", equip: "23 × AXITEC 440 W · 9.9 kW hybrid · BAT-100S", price: 14990, was: 16990, status: "Live", until: "Ends 30 Nov", views: 655, sold: 4, limit: 10 },
  { id: "D-303", title: "10 kWh Battery Add-on", type: "Battery", equip: "BAT-100S · 9.9 kW hybrid inverter", price: 7990, was: 0, status: "Live", until: "Ends 30 Nov", views: 288, sold: 3, limit: 10 },
  { id: "D-304", title: "EV Charger Installed", type: "Single item", equip: "zappi 7 kW", price: 2190, was: 2490, status: "Live", until: "Ends 31 Dec", views: 190, sold: 5, limit: 25 },
  { id: "D-305", title: "Electrify Everything", type: "Everything", equip: "29 × AXITEC 440 W · 9.9 kW hybrid · 20 kWh · zappi · Reclaim", price: 31990, was: 0, status: "Draft", until: "Not published", views: 0, sold: 0, limit: 5 },
  { id: "D-299", title: "Heat Pump Hot Water", type: "Single item", equip: "Reclaim 270 L", price: 3890, was: 4590, status: "Ended", until: "Ended 30 Sep", views: 340, sold: 6, limit: 6 },
];

const STATUS_TONE: Record<Deal["status"], { bg: string; fg: string }> = {
  Live: { bg: "#DCFCE7", fg: "#166534" },
  Draft: { bg: "#E2E8F0", fg: "#334155" },
  Paused: { bg: "#FEF3C7", fg: "#92400E" },
  Ended: { bg: "#FEE2E2", fg: "#B91C1C" },
};

type Order = {
  id: string;
  name: string;
  first: string;
  suburb: string;
  dealId: string;
  deal: string;
  price: number;
  paid: number;
  date: string;
  mob: string;
  email: string;
  addr: string;
};

const ORDERS: Order[] = [
  { id: "RD-1093", name: "Priya Raman", first: "Priya", suburb: "Kellyville", dealId: "D-302", deal: "10 kW Solar + 10 kWh Battery · $14,990", price: 14990, paid: 1500, date: "14 Oct", mob: "0433 918 207", email: "priya.raman@example.com", addr: "9 Arnott Rd, Kellyville NSW 2155" },
  { id: "RD-1091", name: "Tom Fraser", first: "Tom", suburb: "Quakers Hill", dealId: "D-301", deal: "6.6 kW Solar Starter · $5,490", price: 5490, paid: 500, date: "12 Oct", mob: "0419 360 552", email: "tom.fraser@example.com", addr: "31 Hambledon Rd, Quakers Hill NSW 2763" },
  { id: "RD-1088", name: "Mei Chen", first: "Mei", suburb: "Ryde", dealId: "D-303", deal: "10 kWh Battery Add-on · $7,990", price: 7990, paid: 800, date: "9 Oct", mob: "0447 205 113", email: "mei.chen@example.com", addr: "5 Blaxland Rd, Ryde NSW 2112" },
  { id: "RD-1084", name: "Luca Bianchi", first: "Luca", suburb: "Baulkham Hills", dealId: "D-304", deal: "EV Charger Installed · $2,190", price: 2190, paid: 2190, date: "3 Oct", mob: "0408 774 690", email: "luca.bianchi@example.com", addr: "18 Seven Hills Rd, Baulkham Hills NSW 2153" },
];

const STEPS: [string, string][] = [
  ["Call the customer", "Within 1 business day of the order. Introduce yourself and confirm the deal."],
  ["Site check", "Photos or a visit: roof, switchboard, meter. Confirms the price holds."],
  ["Book the install", "Pick a date in My jobs; the customer sees it in their portal."],
  ["Install & commission", "Handover pack, STC paperwork, balance invoice."],
  ["Handover done", "Review request goes out automatically."],
];

const STAGES = ["New · call today", "Called", "Site check done", "Install booked", "Installed", "Complete"];

const CARD = "rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]";
const INPUT =
  "h-10 w-full rounded-[10px] border border-[#CBD5E1] bg-white px-2.5 text-[14px] text-[#0F172A]";
const BTN =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-[14px] font-semibold text-[#0F172A]";
const SUN = "border-0 bg-[#F68A0A] font-bold text-[#3B1D00]";
const PILL = "rounded-full px-2.5 py-[3px] text-[11px] font-bold whitespace-nowrap";

type Form = {
  type: PresetKey;
  q: Record<string, number>;
  price: number;
  was: number;
  dep: number;
  badge: string;
  limit: number;
  until: string;
  inst: boolean;
  stc: boolean;
  title: string;
  desc: string;
  auto: boolean;
};

const blankForm = (type: PresetKey): Form => ({
  type,
  q: { ...PRESETS[type].q },
  price: 0,
  was: 0,
  dep: 0,
  badge: "Best Value",
  limit: 10,
  until: "2026-12-24",
  inst: true,
  stc: true,
  title: "",
  desc: "",
  auto: true,
});

export function InstallerReadyDeals() {
  const [tab, setTab] = useState<"deals" | "create" | "orders">("deals");
  const [deals, setDeals] = useState<Deal[]>(SEED_DEALS);
  const [editing, setEditing] = useState("");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState<Form>(() => blankForm("solarbat"));
  const [currentOrder, setCurrentOrder] = useState("RD-1093");
  const [done, setDone] = useState<Record<string, number[]>>({
    "RD-1093": [],
    "RD-1091": [0, 1],
    "RD-1088": [0, 1, 2],
    "RD-1084": [0, 1, 2, 3],
  });

  const upd = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  /** Builder maths, ported from the mock so the previewed figures match. */
  const build = useMemo(() => {
    const q = form.q;
    const panels = q.pnl || 0;
    const kw = Math.round(panels * 44) / 100;
    const batKwh = (q.b100 || 0) * 10 + (q.fx4660 || 0) * 32.6;
    const invKw = (q.s5 || 0) * 5 + (q.fx99 || 0) * 9.9;
    const list = Object.keys(CAT).reduce((a, k) => a + (q[k] || 0) * CAT[k].price, 0);
    const stcS = panels && invKw && kw / invKw <= 1.33 ? Math.floor(kw * 1.382 * 5) : 0;
    const stcB = Math.floor(Math.min(batKwh, 50) * 6.8);
    const rebate = form.stc ? (stcS + stcB) * 38 : 0;
    const suggested = Math.max(0, Math.round((list - rebate) / 10) * 10 - 10);
    const price = form.price || suggested;
    const dep =
      form.dep || Math.min(price, Math.max(200, Math.round((price * 0.1) / 50) * 50));
    const parts = Object.keys(CAT)
      .filter((k) => q[k])
      .map((k) => (q[k] > 1 ? `${q[k]} × ` : "") + CAT[k].n);
    const autoTitle =
      (kw ? `${kw} kW Solar` : "") +
      (kw && batKwh ? " + " : "") +
      (batKwh ? `${batKwh} kWh Battery` : "") +
      (!kw && !batKwh ? parts.join(" + ") : "") +
      (q.ev && (kw || batKwh) ? " + EV" : "") +
      (q.hp && (kw || batKwh) ? " + Hot water" : "");
    const warn =
      invKw && kw / invKw > 1.33
        ? `Panels are ${Math.round((kw / invKw) * 100)}% of inverter size, over the 133% CEC limit. STCs won't apply.`
        : invKw > 10 && !q.fx4660
          ? "Over 10 kVA of inverter needs three-phase or network approval in most of NSW."
          : batKwh && !q.fx99
            ? "Batteries need the 9.9 kW hybrid inverter unless the customer already has one. Say so in the description."
            : "";
    const margin = Math.max(0, Math.round((price + rebate) / 1.1 - (list * 0.62) / 1.1));
    return {
      kw,
      batKwh,
      list,
      rebate,
      suggested,
      price,
      dep,
      parts,
      autoTitle,
      warn,
      margin,
    };
  }, [form]);

  const title = form.auto ? build.autoTitle || "New deal" : form.title || build.autoTitle;
  const desc =
    form.desc ||
    `${build.parts.join(", ")}. ${form.inst ? "Supplied and installed by a CEC-accredited Solarman crew." : "Delivered to your door."}`;

  const nextId = `D-${306 + deals.filter((d) => Number(d.id.slice(2)) >= 306).length}`;

  const save = (status: Deal["status"]) => {
    const id = editing || nextId;
    const existing = deals.find((d) => d.id === id);
    const rec: Deal = {
      id,
      title,
      type: PRESETS[form.type].label,
      equip: build.parts.join(" · "),
      price: build.price,
      was: form.was || 0,
      status,
      until:
        status === "Live"
          ? `Ends ${new Date(`${form.until}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`
          : "Not published",
      views: existing?.views ?? 0,
      sold: existing?.sold ?? 0,
      limit: form.limit,
    };
    setDeals((ds) => [rec, ...ds.filter((d) => d.id !== id)]);
    setTab("deals");
    setEditing("");
    setMsg(
      status === "Live"
        ? `${rec.id} "${title}" saved as Live in this preview — it was not published to the website.`
        : `${rec.id} saved as a draft in this preview.`,
    );
  };

  const live = deals.filter((d) => d.status === "Live");
  const kpis = [
    {
      l: "Live deals",
      v: String(live.length),
      s: `${live.reduce((a, d) => a + d.views, 0).toLocaleString("en-AU")} views this month`,
    },
    {
      l: "Sold this month",
      v: String(deals.reduce((a, d) => a + d.sold, 0)),
      s: `${ORDERS.length} waiting on next steps`,
    },
    {
      l: "Deal revenue",
      v: money(deals.reduce((a, d) => a + d.sold * d.price, 0)),
      s: "incl GST · deposits held $9,450",
    },
    { l: "View → buy", v: "1.5%", s: "Website average 0.9%" },
  ];

  const order = ORDERS.find((o) => o.id === currentOrder) ?? ORDERS[0];
  const orderDone = done[order.id] ?? [];

  return (
    <div className="flex w-full max-w-[1400px] flex-col gap-[18px]">
      <div className="flex flex-wrap items-end gap-3.5">
        <div className="flex-[1_1_420px]">
          <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
            Ready Deals
          </h1>
          <p className="mt-1 max-w-[760px] text-[13px] leading-[1.5] text-[#5B6B80]">
            Your own promotions: one product, a bundle, a solar system, a battery, or
            everything.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setTab("create");
            setEditing("");
            setMsg("");
            setForm(blankForm("solarbat"));
          }}
          className={`${BTN} ${SUN} h-11`}
        >
          + Create Ready Deal
        </button>
      </div>

      {msg ? (
        <div
          role="status"
          className="rounded-xl bg-[#E0F2FE] px-4 py-3 text-[14px] font-semibold text-[#0B2540]"
        >
          {msg}
        </div>
      ) : null}

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.l} className={`${CARD} flex flex-col gap-1`}>
            <span className="text-[12px] font-semibold text-[#5B6B80]">{k.l}</span>
            <span className="font-source-sans text-[28px] font-bold text-[#0F172A]">
              {k.v}
            </span>
            <span className="text-[12px] font-semibold text-[#475569]">{k.s}</span>
          </div>
        ))}
      </div>

      <div
        role="tablist"
        aria-label="Ready Deals"
        className="flex flex-wrap gap-1 self-start rounded-xl bg-[#E2E8F0] p-1"
      >
        {(
          [
            ["deals", `My deals · ${deals.length}`],
            ["create", editing ? "Edit deal" : "Create deal"],
            ["orders", `Deal orders · ${ORDERS.length}`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              setMsg("");
            }}
            className="h-9 rounded-[9px] px-3.5 text-[13px] font-bold text-[#0F172A]"
            style={{ background: tab === key ? "#FFFFFF" : "transparent" }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "deals" ? (
        <section aria-label="My deals" className="overflow-x-auto rounded-[14px] border border-[#E3E8EF] bg-white">
          <table className="w-full min-w-[920px] border-collapse text-[13px]">
            <thead>
              <tr className="text-left text-[#5B6B80]">
                {["Deal", "Type", "Price", "Status", "Views", "Sold", "Revenue", ""].map(
                  (h, i) => (
                    <th
                      key={h || `actions-${i}`}
                      className="border-b border-[#E3E8EF] p-3 text-[11px] font-bold uppercase tracking-[0.06em]"
                    >
                      {h || <span className="sr-only">Actions</span>}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => {
                const tone = STATUS_TONE[d.status];
                return (
                  <tr key={d.id}>
                    <td className="border-b border-[#E3E8EF] p-3 align-top">
                      <strong className="text-[#0F172A]">{d.title}</strong>
                      <br />
                      <span className="text-[12px] text-[#5B6B80]">
                        {d.id} · {d.equip}
                      </span>
                    </td>
                    <td className="border-b border-[#E3E8EF] p-3 align-top">{d.type}</td>
                    <td className="border-b border-[#E3E8EF] p-3 align-top">
                      <strong>{money(d.price)}</strong>
                      <br />
                      <span className="text-[12px] text-[#5B6B80]">
                        {d.was ? `was ${money(d.was)}` : "incl. installation"}
                      </span>
                    </td>
                    <td className="border-b border-[#E3E8EF] p-3 align-top">
                      <span className={PILL} style={{ background: tone.bg, color: tone.fg }}>
                        {d.status}
                      </span>
                      <br />
                      <span className="text-[12px] text-[#5B6B80]">{d.until}</span>
                    </td>
                    <td className="border-b border-[#E3E8EF] p-3 align-top">{d.views}</td>
                    <td className="border-b border-[#E3E8EF] p-3 align-top">
                      {d.sold} of {d.limit}
                    </td>
                    <td className="border-b border-[#E3E8EF] p-3 align-top font-bold">
                      {money(d.sold * d.price)}
                    </td>
                    <td className="whitespace-nowrap border-b border-[#E3E8EF] p-3 text-right align-top">
                      <button
                        type="button"
                        onClick={() =>
                          setDeals((ds) =>
                            ds.map((x) =>
                              x.id === d.id
                                ? {
                                    ...x,
                                    status: x.status === "Live" ? "Paused" : "Live",
                                    until:
                                      x.status === "Live"
                                        ? "Hidden from website"
                                        : "Ends 31 Dec",
                                  }
                                : x,
                            ),
                          )
                        }
                        className={`${BTN} h-[34px] px-3 text-[13px]`}
                      >
                        {d.status === "Live" ? "Pause" : d.status === "Ended" ? "Relist" : "Publish"}
                      </button>{" "}
                      <button
                        type="button"
                        onClick={() => {
                          const presetKey =
                            (Object.keys(PRESETS) as PresetKey[]).find(
                              (k) => PRESETS[k].label === d.type,
                            ) ?? "solarbat";
                          setTab("create");
                          setEditing(d.id);
                          setMsg("");
                          setForm({
                            ...blankForm(presetKey),
                            price: d.price,
                            was: d.was,
                            title: d.title,
                            limit: d.limit,
                            auto: false,
                          });
                        }}
                        className={`${BTN} h-[34px] px-3 text-[13px]`}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : tab === "create" ? (
        <div className="grid items-start gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(440px,100%),1fr))]">
          <div className="flex min-w-0 flex-col gap-4">
            <section className={`${CARD} flex flex-col gap-3`}>
              <div className="flex items-center gap-2.5">
                <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[#0B1A2E] text-[13px] font-bold text-white">
                  1
                </span>
                <h2 className="m-0 flex-grow text-[16px] font-bold text-[#0F172A]">
                  What kind of deal?
                </h2>
                <span className="text-[12px] text-[#5B6B80]">
                  {editing ? `Editing ${editing}` : `New · will be ${nextId}`}
                </span>
              </div>
              <div
                role="radiogroup"
                aria-label="Deal type"
                className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]"
              >
                {(Object.keys(PRESETS) as PresetKey[]).map((k) => {
                  const on = form.type === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() =>
                        setForm({ ...blankForm(k), badge: form.badge, until: form.until })
                      }
                      className="flex flex-col gap-0.5 rounded-xl border-2 p-3 text-left"
                      style={{
                        borderColor: on ? "#F68A0A" : "#E3E8EF",
                        background: on ? "#FFF4E5" : "#FFFFFF",
                      }}
                    >
                      <strong className="text-[14px] text-[#0F172A]">
                        {PRESETS[k].label}
                      </strong>
                      <span className="text-[12px] text-[#5B6B80]">{PRESETS[k].d}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className={`${CARD} flex flex-col gap-3`}>
              <div className="flex items-center gap-2.5">
                <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[#0B1A2E] text-[13px] font-bold text-white">
                  2
                </span>
                <h2 className="m-0 flex-grow text-[16px] font-bold text-[#0F172A]">
                  Equipment in this deal
                </h2>
              </div>
              <div className="flex flex-col gap-2">
                {Object.keys(CAT).map((k) => {
                  const n = form.q[k] || 0;
                  const item = CAT[k];
                  return (
                    <div
                      key={k}
                      className="flex items-center gap-2.5 rounded-xl border p-2.5"
                      style={{
                        borderColor: n ? "#F68A0A" : "#E3E8EF",
                        background: n ? "#FFF4E5" : "#FFFFFF",
                      }}
                    >
                      <span className="flex min-w-0 flex-grow flex-col">
                        <strong className="text-[14px] text-[#0F172A]">{item.n}</strong>
                        <span className="text-[12px] text-[#5B6B80]">
                          {item.sku} · {item.cat} · {money(item.price)} installed
                          {item.sponsored ? " · sponsored" : ""}
                        </span>
                      </span>
                      <button
                        type="button"
                        aria-label={`Fewer ${item.n}`}
                        onClick={() =>
                          upd({ q: { ...form.q, [k]: Math.max(0, n - 1) }, price: 0 })
                        }
                        className="size-[30px] rounded-lg border border-[#CBD5E1] bg-white font-bold text-[#0F172A]"
                      >
                        −
                      </button>
                      <span aria-live="polite" className="min-w-7 text-center font-bold">
                        {n}
                      </span>
                      <button
                        type="button"
                        aria-label={`More ${item.n}`}
                        onClick={() => upd({ q: { ...form.q, [k]: n + 1 }, price: 0 })}
                        className="size-[30px] rounded-lg border border-[#CBD5E1] bg-white font-bold text-[#0F172A]"
                      >
                        +
                      </button>
                    </div>
                  );
                })}
              </div>
              {build.warn ? (
                <span role="alert" className="text-[13px] font-semibold text-[#92400E]">
                  {build.warn}
                </span>
              ) : null}
            </section>

            <section className={`${CARD} flex flex-col gap-3`}>
              <div className="flex items-center gap-2.5">
                <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[#0B1A2E] text-[13px] font-bold text-white">
                  3
                </span>
                <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Price &amp; offer</h2>
              </div>
              <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
                {[
                  { l: "Equipment + install", v: money(build.list), c: "#0F172A" },
                  { l: "STC rebates", v: `− ${money(build.rebate)}`, c: "#166534" },
                  { l: "Suggested price", v: money(build.suggested), c: "#0F172A" },
                  { l: "Your margin (est.)", v: money(build.margin), c: "#0F172A" },
                ].map((c) => (
                  <div key={c.l} className="flex flex-col gap-0.5 rounded-[10px] bg-[#F8FAFC] p-3">
                    <span className="text-[12px] text-[#5B6B80]">{c.l}</span>
                    <strong className="text-[17px]" style={{ color: c.c }}>
                      {c.v}
                    </strong>
                  </div>
                ))}
              </div>
              <div className="grid gap-2.5 sm:grid-cols-3">
                <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#334155]">
                  Deal price ($ incl GST)
                  <input
                    className={INPUT}
                    inputMode="numeric"
                    value={build.price}
                    onChange={(e) =>
                      upd({ price: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 })
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#334155]">
                  Was price (optional)
                  <input
                    className={INPUT}
                    inputMode="numeric"
                    value={form.was || ""}
                    onChange={(e) =>
                      upd({ was: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 })
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#334155]">
                  Deposit to secure ($)
                  <input
                    className={INPUT}
                    inputMode="numeric"
                    value={build.dep}
                    onChange={(e) =>
                      upd({ dep: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 })
                    }
                  />
                </label>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-3">
                <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#334155]">
                  Badge
                  <select
                    className={INPUT}
                    value={form.badge}
                    onChange={(e) => upd({ badge: e.target.value })}
                  >
                    <option value="">None</option>
                    <option>Best Value</option>
                    <option>Fast Charging</option>
                    <option>Limited stock</option>
                    <option>New</option>
                    <option>Most popular</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#334155]">
                  How many to sell
                  <input
                    className={INPUT}
                    type="number"
                    min={1}
                    value={form.limit}
                    onChange={(e) => upd({ limit: Number(e.target.value) || 1 })}
                  />
                </label>
                <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#334155]">
                  Offer ends
                  <input
                    className={INPUT}
                    type="date"
                    value={form.until}
                    onChange={(e) => upd({ until: e.target.value })}
                  />
                </label>
              </div>
              <label className="flex items-start gap-2.5 text-[13px] leading-[1.4] text-[#334155]">
                <input
                  type="checkbox"
                  checked={form.inst}
                  onChange={() => upd({ inst: !form.inst })}
                  className="mt-0.5 size-[18px] shrink-0 accent-[#F68A0A]"
                />
                <span>
                  <strong>Installation included</strong> (standard install on a
                  single-storey tile or Colorbond roof)
                </span>
              </label>
              <label className="flex items-start gap-2.5 text-[13px] leading-[1.4] text-[#334155]">
                <input
                  type="checkbox"
                  checked={form.stc}
                  onChange={() => upd({ stc: !form.stc })}
                  className="mt-0.5 size-[18px] shrink-0 accent-[#F68A0A]"
                />
                <span>Price is after STC rebates, which you claim</span>
              </label>
            </section>

            <section className={`${CARD} flex flex-col gap-3`}>
              <div className="flex items-center gap-2.5">
                <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[#0B1A2E] text-[13px] font-bold text-white">
                  4
                </span>
                <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Listing</h2>
              </div>
              <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#334155]">
                Title
                <input
                  className={INPUT}
                  value={title}
                  onChange={(e) => upd({ title: e.target.value, auto: false })}
                />
              </label>
              <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#334155]">
                Short description
                <textarea
                  className={`${INPUT} h-auto py-2`}
                  rows={2}
                  value={desc}
                  onChange={(e) => upd({ desc: e.target.value })}
                />
              </label>
              <div className="flex flex-wrap justify-end gap-2.5">
                <button type="button" onClick={() => save("Draft")} className={BTN}>
                  Save draft
                </button>
                <button
                  type="button"
                  disabled={!build.parts.length || !build.price}
                  onClick={() => save("Live")}
                  className={`${BTN} ${SUN} h-11 disabled:opacity-50`}
                >
                  Save as Live (preview)
                </button>
              </div>
            </section>
          </div>

          <aside aria-label="Preview" className="flex min-w-0 flex-col gap-4">
            <section className={`${CARD} flex flex-col gap-3`}>
              <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">
                Preview · how the listing would look
              </h2>
              <article className="flex flex-col overflow-hidden rounded-2xl border border-[#E3E8EF] bg-white">
                <div className="relative flex h-[150px] items-center justify-center bg-[#0B1A2E]">
                  <svg width="220" height="110" viewBox="0 0 220 110" aria-hidden="true">
                    <path d="M20 70 110 20 200 70Z" fill="#13263F" />
                    <g fill="#1976D2" stroke="#0B1A2E" strokeWidth={1.5}>
                      <rect x="70" y="40" width="20" height="14" />
                      <rect x="92" y="40" width="20" height="14" />
                      <rect x="114" y="40" width="20" height="14" />
                      <rect x="60" y="55" width="20" height="14" />
                      <rect x="82" y="55" width="20" height="14" />
                      <rect x="104" y="55" width="20" height="14" />
                      <rect x="126" y="55" width="20" height="14" />
                    </g>
                    <rect x="40" y="70" width="140" height="36" fill="#1B3557" />
                    <rect
                      x="150"
                      y="78"
                      width="16"
                      height="22"
                      rx="2"
                      fill={build.batKwh ? "#7EE2A0" : "#2A4466"}
                    />
                  </svg>
                  <span
                    className={`${PILL} absolute left-3 top-3 bg-[#F68A0A] text-[12px] text-[#3B1D00]`}
                  >
                    {build.kw
                      ? `${build.kw} kW${build.batKwh ? ` · ${build.batKwh} kWh` : ""}`
                      : build.batKwh
                        ? `${build.batKwh} kWh`
                        : build.parts.length > 1
                          ? "Bundle"
                          : "Single item"}
                  </span>
                  {form.badge ? (
                    <span
                      className={`${PILL} absolute right-3 top-3 bg-[#7EE2A0] text-[12px] text-[#0B2A17]`}
                    >
                      {form.badge}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 p-4">
                  <strong className="font-source-sans text-[20px] leading-[1.2] text-[#0F172A]">
                    {title}
                  </strong>
                  <span className="text-[13px] leading-[1.45] text-[#475569]">{desc}</span>
                  {form.inst ? (
                    <span className={`${PILL} self-start bg-[#E0F2FE] text-[#0B2540]`}>
                      Installation Included
                    </span>
                  ) : null}
                  <div className="flex flex-wrap items-end gap-2.5">
                    <span className="flex flex-col">
                      {form.was > build.price ? (
                        <s className="text-[13px] text-[#5B6B80]">{money(form.was)}</s>
                      ) : null}
                      <strong className="font-source-sans text-[26px] text-[#0F172A]">
                        {money(build.price)}
                      </strong>
                      <span className="text-[12px] text-[#5B6B80]">
                        incl. installation · {money(build.dep)} deposit
                      </span>
                    </span>
                    <span className={`${BTN} ${SUN} ml-auto h-[42px]`}>Buy Now</span>
                  </div>
                </div>
              </article>
              <p className="m-0 text-[12px] text-[#475569]">
                Preview only — this app has no website publishing, so saving does not
                create a real listing.
              </p>
            </section>
          </aside>
        </div>
      ) : (
        <div className="grid items-start gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(420px,100%),1fr))]">
          <section
            aria-label="Deal orders"
            className="overflow-hidden rounded-[14px] border border-[#E3E8EF] bg-white"
          >
            {ORDERS.map((o) => {
              const n = (done[o.id] ?? []).length;
              const on = o.id === order.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setCurrentOrder(o.id)}
                  className="flex w-full flex-col gap-1 border-b border-[#E3E8EF] border-l-4 p-4 text-left last:border-b-0"
                  style={{
                    borderLeftColor: on ? "#F68A0A" : "transparent",
                    background: on ? "#F8FAFC" : "#FFFFFF",
                  }}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <strong className="flex-grow text-[14px] text-[#0F172A]">
                      {o.name} · {o.suburb}
                    </strong>
                    <span className={`${PILL} bg-[#E0F2FE] text-[#0F172A]`}>
                      {STAGES[n]}
                    </span>
                  </span>
                  <span className="text-[13px] text-[#334155]">{o.deal}</span>
                  <span className="text-[12px] text-[#5B6B80]">
                    {o.id} · ordered {o.date} ·{" "}
                    {o.paid >= o.price ? "paid in full" : `${money(o.paid)} deposit paid`}
                  </span>
                  <span
                    className="text-[12px] font-bold"
                    style={{ color: n === 0 ? "#B91C1C" : "#475569" }}
                  >
                    Next: {n < STEPS.length ? STEPS[n][0] : "Nothing — complete"}
                  </span>
                </button>
              );
            })}
          </section>

          <section aria-label="Order detail" className={`${CARD} flex flex-col gap-3`}>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="m-0 flex-grow text-[20px] font-bold text-[#0F172A]">
                {order.name}
              </h2>
              <span className={`${PILL} bg-[#E2E8F0] text-[#334155]`}>
                Ready Deal {order.dealId}
              </span>
            </div>
            <span className="text-[14px] text-[#334155]">{order.deal}</span>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1.5 text-[13px]">
              {[
                ["Mobile", order.mob],
                ["Email", order.email],
                ["Address", order.addr],
                ["Paid", money(order.paid)],
                ["Balance on install", money(order.price - order.paid)],
              ].map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-[#5B6B80]">{k}</dt>
                  <dd className="m-0 font-semibold text-[#0F172A]">{v}</dd>
                </div>
              ))}
            </dl>

            <h3 className="m-0 mt-1 text-[14px] font-bold text-[#0F172A]">Next steps</h3>
            <div className="flex flex-col gap-1.5">
              {STEPS.map(([t, d], i) => {
                const isDone = orderDone.includes(i);
                return (
                  <label
                    key={t}
                    className="flex items-start gap-2.5 rounded-[10px] p-2.5 text-[13px] leading-[1.4]"
                    style={{ background: isDone ? "#DCFCE7" : "#F8FAFC" }}
                  >
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() =>
                        setDone((prev) => ({
                          ...prev,
                          [order.id]: isDone
                            ? orderDone.filter((x) => x !== i)
                            : [...orderDone, i],
                        }))
                      }
                      className="mt-0.5 size-[18px] shrink-0 accent-[#F68A0A]"
                    />
                    <span className="flex-grow">
                      <strong className="text-[#0F172A]">{t}</strong>
                      <br />
                      <span className="text-[12px] text-[#5B6B80]">{d}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        </div>
      )}

      <p className="m-0 text-[12px] text-[#475569]">
        Sample deals and orders. There is no Ready Deals backend in this app yet, so
        nothing here is published, charged or saved — see{" "}
        <Link href="/installers/dashboard/customers" className="font-semibold text-[#1565C0]">
          Customers
        </Link>{" "}
        for your real jobs.
      </p>
    </div>
  );
}
