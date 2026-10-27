"use client";

import { useMemo, useState } from "react";
import { dcAcLimitLabel, dcAcLimitPercent } from "@/lib/designer/designRules";

/**
 * Matches the Easylink Designer "Ready Sites" mock exactly
 * (DistReadySites.dc.html): the listing with status filters and the full
 * create/publish form with its live previews.
 *
 * There is no marketplace model in this app yet — no Ready Site listings,
 * site fees, installer purchases or deposit custody — so the seed listings
 * are the mock's sample data. The behaviour is the mock's own logic, ported
 * rather than faked: system size derives from panel count, the site fee
 * follows the chosen model, the money cards and listing previews recompute
 * from the form, and publishing/saving a draft really adds the record to the
 * list (for this session only, in memory).
 */

const money = (n: number) => "$" + Math.round(Number(n) || 0).toLocaleString("en-AU");

const INV: Record<string, [string, number]> = {
  s5: ["5 kW inverter · INV-S5", 5],
  fx99: ["9.9 kW hybrid · INV-FX99", 9.9],
  g10: ["10 kW three-phase hybrid · INV-G10T", 10],
  none: ["No inverter", 0],
};

const BAT: Record<string, [string, number, string]> = {
  none: ["No battery", 0, ""],
  b100: ["10 kWh · BAT-100S", 10, "BAT-100S"],
  b200: ["20 kWh · BAT-100S × 2", 20, "BAT-100S × 2"],
  fx: ["16.1 kWh · FOX ESS EP-16", 16.1, "FOX ESS EP-16"],
  fx4660: ["32.6 kWh · BAT-FX4660", 32.6, "BAT-FX4660"],
};

const kwOf = (p: number) => Math.round(p * 44) / 100;

type Site = {
  id: string;
  suburb: string;
  state: string;
  pc: string;
  panels: number;
  inv: string;
  bat: string;
  roof: string;
  storeys: string;
  payConf: boolean;
  paid: number;
  instConf: boolean;
  from?: string;
  to?: string;
  contract: number;
  fee: number;
  status: string;
  buyer?: string;
  views: number;
  watch: number;
  title: string;
};

const SEED: Site[] = [
  { id: "RS-2041", suburb: "Kellyville", state: "NSW", pc: "2155", panels: 23, inv: "fx99", bat: "b100", roof: "Tile", storeys: "Single storey", payConf: true, paid: 2000, instConf: true, from: "2026-11-18", to: "2026-11-22", contract: 15890, fee: 890, status: "Live", views: 38, watch: 5, title: "" },
  { id: "RS-2042", suburb: "Marsden Park", state: "NSW", pc: "2765", panels: 15, inv: "s5", bat: "none", roof: "Colorbond", storeys: "Single storey", payConf: true, paid: 1000, instConf: false, contract: 6490, fee: 450, status: "Live", views: 21, watch: 3, title: "" },
  { id: "RS-2043", suburb: "Castle Hill", state: "NSW", pc: "2154", panels: 30, inv: "g10", bat: "b200", roof: "Tile", storeys: "Double storey", payConf: false, paid: 0, instConf: true, from: "2026-11-26", to: "2026-11-28", contract: 24650, fee: 1250, status: "Live", views: 44, watch: 6, title: "" },
  { id: "RS-2044", suburb: "Penrith", state: "NSW", pc: "2750", panels: 0, inv: "fx99", bat: "fx", roof: "Colorbond", storeys: "Single storey", payConf: true, paid: 9800, instConf: true, from: "2026-11-04", to: "2026-11-06", contract: 9800, fee: 600, status: "Reserved", views: 30, watch: 4, title: "" },
  { id: "RS-2046", suburb: "Wollongong", state: "NSW", pc: "2500", panels: 23, inv: "fx99", bat: "none", roof: "Tile", storeys: "Single storey", payConf: true, paid: 1500, instConf: true, from: "2026-11-11", to: "2026-11-14", contract: 10990, fee: 690, status: "Live", views: 12, watch: 1, title: "" },
  { id: "RS-2045", suburb: "Ryde", state: "NSW", pc: "2112", panels: 20, inv: "fx99", bat: "b100", roof: "Tile", storeys: "Double storey", payConf: false, paid: 0, instConf: true, from: "2026-12-01", to: "2026-12-05", contract: 13990, fee: 750, status: "Draft", views: 0, watch: 0, title: "" },
  { id: "RS-2039", suburb: "Blacktown", state: "NSW", pc: "2148", panels: 15, inv: "s5", bat: "b100", roof: "Tile", storeys: "Single storey", payConf: true, paid: 1500, instConf: true, from: "2026-10-21", to: "2026-10-23", contract: 11490, fee: 690, status: "Sold", buyer: "Solarman Pty Ltd", views: 52, watch: 0, title: "" },
  { id: "RS-2031", suburb: "Campbelltown", state: "NSW", pc: "2560", panels: 15, inv: "s5", bat: "none", roof: "Tile", storeys: "Single storey", payConf: false, paid: 0, instConf: true, from: "2026-10-08", to: "2026-10-10", contract: 6290, fee: 400, status: "Expired", views: 17, watch: 0, title: "" },
];

type Lead = {
  name: string;
  mob: string;
  email: string;
  street: string;
  suburb: string;
  state: string;
  pc: string;
  panels: number;
  inv: string;
  bat: string;
  contract: number;
  paid: number;
  payConf: boolean;
  instConf: boolean;
  roof: string;
  storeys: string;
  phase: string;
};

const LEADS: Record<string, Lead> = {
  "Q-1187": { name: "Sarah Lim", mob: "0412 448 913", email: "sarah.lim@example.com", street: "14 Hezlett Rd", suburb: "Kellyville Ridge", state: "NSW", pc: "2155", panels: 25, inv: "fx99", bat: "b100", contract: 15628, paid: 2000, payConf: true, instConf: true, roof: "Tile", storeys: "Single storey", phase: "Single phase" },
  "Q-1192": { name: "Ahmed Haddad", mob: "0431 220 784", email: "ahmed.haddad@example.com", street: "7 Carnarvon St", suburb: "Auburn", state: "NSW", pc: "2144", panels: 15, inv: "s5", bat: "none", contract: 6490, paid: 1000, payConf: true, instConf: false, roof: "Colorbond", storeys: "Single storey", phase: "Single phase" },
  "Q-1199": { name: "Grace Tan", mob: "0405 118 362", email: "grace.tan@example.com", street: "22 Darvall Rd", suburb: "West Ryde", state: "NSW", pc: "2114", panels: 29, inv: "fx99", bat: "b200", contract: 23524, paid: 0, payConf: false, instConf: true, roof: "Tile", storeys: "Double storey", phase: "Single phase" },
};

type Form = {
  lead: string;
  name: string;
  mob: string;
  email: string;
  street: string;
  suburb: string;
  state: string;
  pc: string;
  roof: string;
  storeys: string;
  phase: string;
  payConf: boolean;
  paid: number;
  payMethod: string;
  paidOn: string;
  instConf: boolean;
  from: string;
  to: string;
  panels: number;
  inv: string;
  bat: string;
  ev: boolean;
  hp: boolean;
  supply: boolean;
  contract: number;
  feeModel: string;
  fee: number;
  pct: number;
  web: boolean;
  portal: boolean;
  aud: string;
  head: string;
  expiry: string;
  accred: boolean;
  notes: string;
  title: string;
  docs: Record<string, boolean>;
};

function blank(lead: string): Form {
  const L = (lead && LEADS[lead]) || ({} as Partial<Lead>);
  return {
    lead: lead || "",
    name: "",
    mob: "",
    email: "",
    street: "",
    suburb: "",
    state: "NSW",
    pc: "",
    roof: "Tile",
    storeys: "Single storey",
    phase: "Single phase",
    payConf: false,
    paid: 0,
    payMethod: "Card · Stripe",
    paidOn: "2026-10-14",
    instConf: false,
    from: "2026-11-17",
    to: "2026-11-21",
    panels: 20,
    inv: "fx99",
    bat: "none",
    ev: false,
    hp: false,
    supply: true,
    contract: 12000,
    feeModel: "fixed",
    fee: 850,
    pct: 5.5,
    web: true,
    portal: true,
    aud: "area",
    head: "6",
    expiry: "2026-10-31",
    accred: true,
    notes:
      "Customer prefers morning calls. Dog on site, side gate code given after purchase.",
    title: "",
    docs: { quote: true, receipt: true, photos: true, bill: true, switchboard: false, nmi: true },
    ...L,
  };
}

const ST: Record<string, [string, string]> = {
  Live: ["#DCFCE7", "#166534"],
  Draft: ["#E2E8F0", "#334155"],
  Reserved: ["#FEF3C7", "#92400E"],
  Sold: ["#0B1A2E", "#FFFFFF"],
  Expired: ["#FEE2E2", "#B91C1C"],
};

const NOTE: Record<string, string> = {
  Live: "On website + highlighted",
  Draft: "Not visible yet",
  Reserved: "Bright Spark Electrical · 24 h hold",
  Sold: "Sold to Solarman Pty Ltd",
  Expired: "Relist or refund deposit",
};

const FLOW = [
  { n: 1, t: "Create", d: "From a lead, a Solar Design or blank. Tick what the customer has confirmed and attach documents.", where: "EasyLink Operations" },
  { n: 2, t: "Publish", d: "The card goes on the website and is highlighted in matching installers' portals (SMS + push).", where: "Website · Installer portal" },
  { n: 3, t: "Buy", d: "An installer pays the site fee. The listing closes for everyone else straight away.", where: "Installer portal → Ready Sites" },
  { n: 4, t: "Hand over", d: "Customer details, documents and the deposit pass to the installer. The customer is added to their Customers and My jobs.", where: "Installer portal → Customers" },
  { n: 5, t: "Track", d: "The job shows in Jobs & installs here, and the customer sees their installer in the Customer Portal.", where: "EasyLink Operations · Customer portal" },
];

const DOCS: [string, string][] = [
  ["quote", "Signed quote"],
  ["receipt", "Deposit receipt"],
  ["photos", "Roof photos (6)"],
  ["bill", "Electricity bill"],
  ["switchboard", "Switchboard photo"],
  ["nmi", "NMI + meter number"],
];

const STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"];
const ROOFS = ["Tile", "Colorbond", "Klip-lok", "Flat (tilt frames)"];

const dfmt = (d?: string) => {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" });
};

const sysOf = (s: Site) => {
  const kw = kwOf(s.panels);
  const b = BAT[s.bat] ?? BAT.none!;
  return (s.panels ? kw + " kW solar" : "Battery retrofit") + (b[1] ? " + " + b[1] + " kWh battery" : "");
};

const confOf = (s: Site) => {
  const c: { t: string; bg: string; fg: string }[] = [];
  if (s.payConf)
    c.push({
      t: s.paid >= s.contract && s.contract > 0 ? "Paid in full" : "Payment",
      bg: "#DCFCE7",
      fg: "#166534",
    });
  if (s.instConf) c.push({ t: "Installation", bg: "#E0F2FE", fg: "#0B2540" });
  return c;
};

const INPUT =
  "h-10 w-full min-w-0 rounded-[10px] border border-[#CBD5E1] bg-white px-2.5 text-[14px] text-[#0F172A]";
const LBL = "flex min-w-0 flex-col gap-1 text-[12px] font-semibold text-[#334155]";
const CARD =
  "flex min-w-0 flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]";
const BTN =
  "inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-[14px] font-semibold text-[#0F172A]";

export function MasterReadySites() {
  const [sites, setSites] = useState<Site[]>(SEED);
  const [mode, setMode] = useState<"list" | "create">("list");
  const [filter, setFilter] = useState("all");
  const [src, setSrc] = useState("lead");
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState("");
  const [f, setF] = useState<Form>(() => blank("Q-1187"));

  const upd = (o: Partial<Form>) => setF((prev) => ({ ...prev, ...o }));

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: sites.length };
    sites.forEach((s) => {
      c[s.status] = (c[s.status] ?? 0) + 1;
    });
    return c;
  }, [sites]);

  const rows = sites.filter((s) => filter === "all" || s.status === filter);

  const live = sites.filter((s) => s.status === "Live");
  const kpis = [
    {
      l: "Live on website",
      v: String(live.length),
      s: live.reduce((a, s) => a + s.watch, 0) + " installers watching",
    },
    {
      l: "Contract value live",
      v: money(live.reduce((a, s) => a + s.contract, 0)),
      s: money(live.reduce((a, s) => a + (s.payConf ? s.paid : 0), 0)) + " in deposits held",
    },
    {
      l: "Sold this month",
      v: String(9 + sites.filter((s) => s.status === "Sold").length - 1),
      s: "$7,460 in site fees ex GST",
    },
    { l: "Average time to sell", v: "1.6 days", s: "82% sold before expiry" },
  ];

  const nextId =
    "RS-" +
    (2047 +
      sites.filter((s) => /^RS-20[4-9]\d$/.test(s.id) && Number(s.id.slice(3)) >= 2047).length);

  // Derived form values — the mock's own maths.
  const kw = kwOf(f.panels);
  const inv = INV[f.inv] ?? INV.fx99!;
  const bat = BAT[f.bat] ?? BAT.none!;
  const ratio = inv[1] ? Math.round((kw / inv[1]) * 100) : 0;
  // 200% with a hybrid inverter or a battery, else the 133% STC rule.
  const limitHybridOrBattery = inv[0].includes("hybrid") || bat[1] > 0;
  const limitPct = dcAcLimitPercent(limitHybridOrBattery);
  const fee = f.feeModel === "pct" ? Math.round((f.contract * f.pct) / 100) : f.fee;
  const autoTitle =
    (f.panels ? kw + " kW solar" : "Battery retrofit") +
    (bat[1] ? " + " + bat[1] + " kWh battery" : "") +
    " · " +
    (f.suburb || "Suburb") +
    " " +
    f.state;
  const title = f.title || autoTitle;
  const badges: string[] = [];
  if (f.payConf) badges.push(f.paid >= f.contract ? "Paid in full" : money(f.paid) + " paid");
  if (f.instConf) badges.push("Install booked");
  const confLabel =
    f.payConf && f.instConf
      ? "Payment + installation confirmed"
      : f.payConf
        ? "Payment confirmed"
        : f.instConf
          ? "Installation confirmed"
          : "Nothing confirmed yet";
  const noConf = !f.payConf && !f.instConf;
  const equip =
    [
      f.panels ? f.panels + " × AXITEC 440 W panels" : "",
      inv[1] ? inv[0] : "",
      bat[1] ? bat[0] : "",
      f.ev ? "zappi 7 kW EV charger" : "",
      f.hp ? "Reclaim 270 L heat pump" : "",
    ]
      .filter(Boolean)
      .join(" · ") + (f.supply ? ". Equipment supplied and delivered." : ".");
  const docCount = DOCS.filter(([k]) => f.docs[k]).length;
  const feeLabel =
    f.feeModel === "pct"
      ? "Fee (% of contract)"
      : f.feeModel === "offer"
        ? "Reserve price ($ ex GST)"
        : "Site fee ($ ex GST)";
  const cantPublish = noConf || !f.suburb || !f.pc;

  const moneyCards = [
    { l: "Customer contract", v: money(f.contract), s: "incl GST · paid to the installer" },
    {
      l: "Held by EasyLink",
      v: f.payConf ? money(f.paid) : "$0",
      s: f.payConf ? "passes to the installer on purchase" : "nothing paid yet",
    },
    {
      l: "Balance to collect",
      v: money(Math.max(0, f.contract - (f.payConf ? f.paid : 0))),
      s: "by the installer, on install",
    },
    {
      l: "Site fee to EasyLink",
      v: money(fee),
      s: f.feeModel === "offer" ? "reserve · highest offer wins" : "ex GST · charged at purchase",
    },
  ];

  const save = (status: string) => {
    const rec: Site = {
      id: editing || nextId,
      suburb: f.suburb || "Suburb",
      state: f.state,
      pc: f.pc,
      panels: f.panels,
      inv: f.inv,
      bat: f.bat,
      roof: f.roof,
      storeys: f.storeys,
      payConf: f.payConf,
      paid: f.payConf ? f.paid : 0,
      instConf: f.instConf,
      from: f.from,
      to: f.to,
      contract: f.contract,
      fee,
      status,
      views: 0,
      watch: 0,
      title,
    };
    setSites((prev) => [rec, ...prev.filter((s) => s.id !== rec.id)]);
    setMode("list");
    setFilter("all");
    setEditing("");
    setMsg(
      status === "Live"
        ? `${rec.id} is live. It's on easylinksolar.com.au/ready-sites and highlighted for installers who service ${rec.pc}` +
            (f.head !== "0" ? ` (Elite installers first for ${f.head} h).` : ".")
        : `${rec.id} saved as a draft.`,
    );
  };

  const editSite = (s: Site) => {
    setMode("create");
    setEditing(s.id);
    setMsg("");
    setSrc("blank");
    setF({
      ...blank(""),
      name: "Customer on file",
      mob: "04XX XXX XXX",
      email: "on file",
      street: "on file",
      suburb: s.suburb,
      state: s.state,
      pc: s.pc,
      panels: s.panels,
      inv: s.inv,
      bat: s.bat,
      roof: s.roof,
      storeys: s.storeys,
      payConf: s.payConf,
      paid: s.paid,
      instConf: s.instConf,
      from: s.from ?? "2026-11-17",
      to: s.to ?? "2026-11-21",
      contract: s.contract,
      fee: s.fee,
    });
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          Installer network <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Ready Sites</span>
        </nav>
        <span className="rounded-full bg-[#DBEAFE] px-2.5 py-[3px] text-[12px] font-bold text-[#1E40AF]">
          Sample data
        </span>
        <span title="Not built yet" className={`${BTN} cursor-default`}>
          View on website
        </span>
        <span title="Not built yet" className={`${BTN} cursor-default`}>
          Installer view
        </span>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-[18px] px-8 py-6 pb-14">
        <div className="flex flex-wrap items-end gap-3.5">
          <div className="flex-[1_1_420px]">
            <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">Ready Sites</h1>
            <p className="mt-1 max-w-[760px] text-[13px] leading-[1.5] text-[#5B6B80]">
              Customers who have already confirmed payment, installation or both. Sites you publish
              go to the Ready Sites section of easylinksolar.com.au and are highlighted in the portal
              of every matching installer. The first installer to buy a site owns the customer and
              the job.
            </p>
          </div>
          {mode === "list" ? (
            <button
              type="button"
              onClick={() => {
                setMode("create");
                setEditing("");
                setMsg("");
                setSrc("lead");
                setF(blank("Q-1187"));
              }}
              className="inline-flex h-11 items-center rounded-[10px] bg-[#F68A0A] px-4 text-[14px] font-bold text-[#3B1D00]"
            >
              + Create Ready Site
            </button>
          ) : (
            <button type="button" onClick={() => setMode("list")} className={`${BTN} h-11`}>
              ← All Ready Sites
            </button>
          )}
        </div>

        {msg ? (
          <div
            role="status"
            className="flex flex-wrap items-center gap-2.5 rounded-[12px] bg-[#DCFCE7] px-4 py-3 text-[14px] font-semibold text-[#166534]"
          >
            <span className="flex-grow">{msg}</span>
          </div>
        ) : null}

        <div
          className="grid gap-3.5"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}
        >
          {kpis.map((k) => (
            <div
              key={k.l}
              className="flex flex-col gap-1 rounded-[14px] border border-[#E3E8EF] bg-white p-4"
            >
              <span className="text-[12px] font-semibold text-[#5B6B80]">{k.l}</span>
              <span className="font-source-sans text-[28px] font-bold text-[#0F172A]">{k.v}</span>
              <span className="text-[12px] font-semibold text-[#475569]">{k.s}</span>
            </div>
          ))}
        </div>

        {mode === "list" ? (
          <>
            <section
              aria-label="All Ready Sites"
              className="overflow-hidden rounded-[14px] border border-[#E3E8EF] bg-white"
            >
              <div className="flex flex-wrap items-center gap-2 border-b border-[#E3E8EF] px-[18px] py-3.5">
                <h2 className="m-0 flex-grow text-[16px] font-bold text-[#0F172A]">
                  All Ready Sites
                </h2>
                <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1.5">
                  {[
                    ["all", "All"],
                    ["Live", "Live"],
                    ["Draft", "Draft"],
                    ["Reserved", "Reserved"],
                    ["Sold", "Sold"],
                    ["Expired", "Expired"],
                  ].map(([k, label]) => {
                    const on = filter === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setFilter(k!)}
                        className="h-[34px] rounded-full border px-3 text-[13px] font-semibold"
                        style={{
                          borderColor: on ? "#0B1A2E" : "#CBD5E1",
                          background: on ? "#0B1A2E" : "#FFFFFF",
                          color: on ? "#FFFFFF" : "#0F172A",
                        }}
                      >
                        {label} · {counts[k!] ?? 0}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse">
                  <thead>
                    <tr>
                      {[
                        "Site",
                        "System",
                        "Customer has confirmed",
                        "Contract value",
                        "Site fee",
                        "Status",
                        "Interest",
                      ].map((h) => (
                        <th
                          key={h}
                          className="border-b border-[#E3E8EF] px-2.5 py-2 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-[#5B6B80]"
                        >
                          {h}
                        </th>
                      ))}
                      <th className="border-b border-[#E3E8EF] px-2.5 py-2">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((s) => {
                      const st = ST[s.status] ?? ST.Draft!;
                      return (
                        <tr key={s.id}>
                          <td className="border-b border-[#E3E8EF] px-2.5 py-3 align-top text-[13px] text-[#0F172A]">
                            <strong>{s.id}</strong>
                            <br />
                            <span className="text-[12px] text-[#5B6B80]">
                              {s.suburb} {s.state} {s.pc}
                            </span>
                          </td>
                          <td className="border-b border-[#E3E8EF] px-2.5 py-3 align-top text-[13px] text-[#0F172A]">
                            {sysOf(s)}
                            <br />
                            <span className="text-[12px] text-[#5B6B80]">
                              {s.roof} · {s.storeys}
                            </span>
                          </td>
                          <td className="border-b border-[#E3E8EF] px-2.5 py-3 align-top text-[13px]">
                            <span className="flex flex-wrap gap-1">
                              {confOf(s).map((c) => (
                                <span
                                  key={c.t}
                                  className="whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11px] font-bold"
                                  style={{ background: c.bg, color: c.fg }}
                                >
                                  {c.t}
                                </span>
                              ))}
                            </span>
                            <span className="text-[12px] text-[#5B6B80]">
                              {s.instConf && s.from
                                ? `Install ${dfmt(s.from)}–${dfmt(s.to)}`
                                : "Install date open"}
                            </span>
                          </td>
                          <td className="border-b border-[#E3E8EF] px-2.5 py-3 align-top text-[13px] font-bold text-[#0F172A]">
                            {money(s.contract)}
                            <br />
                            <span className="text-[12px] font-normal text-[#5B6B80]">
                              {s.payConf ? `${money(s.paid)} held by EasyLink` : "Pay on install"}
                            </span>
                          </td>
                          <td className="border-b border-[#E3E8EF] px-2.5 py-3 align-top text-[13px] font-bold text-[#0F172A]">
                            {money(s.fee)}
                            <br />
                            <span className="text-[12px] font-normal text-[#5B6B80]">ex GST</span>
                          </td>
                          <td className="border-b border-[#E3E8EF] px-2.5 py-3 align-top text-[13px]">
                            <span
                              className="whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11px] font-bold"
                              style={{ background: st[0], color: st[1] }}
                            >
                              {s.status}
                            </span>
                            <br />
                            <span className="text-[12px] text-[#5B6B80]">
                              {s.status === "Sold" && s.buyer ? `Sold to ${s.buyer}` : NOTE[s.status]}
                            </span>
                          </td>
                          <td className="border-b border-[#E3E8EF] px-2.5 py-3 align-top text-[13px] text-[#0F172A]">
                            {s.views} views
                            <br />
                            <span className="text-[12px] text-[#5B6B80]">
                              {s.watch} installers watching
                            </span>
                          </td>
                          <td className="border-b border-[#E3E8EF] px-2.5 py-3 text-right align-top">
                            <button
                              type="button"
                              onClick={() => editSite(s)}
                              className="h-[34px] rounded-[10px] border border-[#CBD5E1] bg-white px-3 text-[13px] font-semibold text-[#0F172A]"
                            >
                              {s.status === "Sold"
                                ? "Open job"
                                : s.status === "Expired"
                                  ? "Relist"
                                  : "Edit"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section aria-label="How Ready Sites work" className={CARD}>
              <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">
                How a Ready Site moves through the portals
              </h2>
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}
              >
                {FLOW.map((s) => (
                  <div
                    key={s.n}
                    className="flex flex-col gap-1.5 rounded-[12px] bg-[#F8FAFC] p-3"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[#0B1A2E] text-[13px] font-bold text-white">
                        {s.n}
                      </span>
                      <strong className="text-[14px] text-[#0F172A]">{s.t}</strong>
                    </span>
                    <span className="text-[13px] leading-[1.45] text-[#475569]">{s.d}</span>
                    <span className="text-[12px] font-bold text-[#5B6B80]">{s.where}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <div
            className="grid items-start gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))" }}
          >
            <div className="flex min-w-0 flex-col gap-4">
              <section className={CARD}>
                <div className="flex items-center gap-2.5">
                  <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[#0B1A2E] text-[13px] font-bold text-white">
                    1
                  </span>
                  <h2 className="m-0 flex-grow text-[16px] font-bold text-[#0F172A]">Start from</h2>
                  <span className="text-[12px] text-[#5B6B80]">
                    {editing ? `Editing ${editing}` : `New · will be ${nextId}`}
                  </span>
                </div>
                <div role="group" aria-label="Start from" className="flex flex-wrap gap-1.5">
                  {[
                    ["lead", "A lead in Quotes & leads"],
                    ["design", "A Solar Design"],
                    ["blank", "Blank"],
                  ].map(([k, label]) => {
                    const on = src === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        aria-pressed={on}
                        onClick={() => {
                          setSrc(k!);
                          setF(
                            k === "lead"
                              ? blank("Q-1187")
                              : k === "design"
                                ? { ...blank("Q-1199"), lead: "" }
                                : blank(""),
                          );
                        }}
                        className="h-9 rounded-full border px-3.5 text-[13px] font-semibold"
                        style={{
                          borderColor: on ? "#0B1A2E" : "#CBD5E1",
                          background: on ? "#0B1A2E" : "#FFFFFF",
                          color: on ? "#FFFFFF" : "#0F172A",
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                {src === "lead" ? (
                  <label className={LBL}>
                    Lead from Quotes &amp; leads (fills everything below)
                    <select
                      className={INPUT}
                      value={f.lead}
                      onChange={(e) => setF(blank(e.target.value))}
                    >
                      {Object.keys(LEADS).map((id) => (
                        <option key={id} value={id}>
                          {id} · {LEADS[id]!.name} · {LEADS[id]!.suburb} ·{" "}
                          {money(LEADS[id]!.contract)}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {src === "design" ? (
                  <span className="text-[13px] leading-[1.5] text-[#475569]">
                    Uses the option the customer picked in Solar Design (roof image, panels and
                    equipment come across).
                  </span>
                ) : null}
              </section>

              <section className={CARD}>
                <div className="flex items-center gap-2.5">
                  <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[#0B1A2E] text-[13px] font-bold text-white">
                    2
                  </span>
                  <h2 className="m-0 flex-grow text-[16px] font-bold text-[#0F172A]">
                    Customer &amp; site
                  </h2>
                  <span className="rounded-full bg-[#E2E8F0] px-2.5 py-[3px] text-[11px] font-bold text-[#334155]">
                    Private until bought
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className={LBL}>
                    Customer name
                    <input className={INPUT} value={f.name} onChange={(e) => upd({ name: e.target.value })} />
                  </label>
                  <label className={LBL}>
                    Mobile
                    <input className={INPUT} type="tel" value={f.mob} onChange={(e) => upd({ mob: e.target.value })} />
                  </label>
                  <label className={LBL}>
                    Email
                    <input className={INPUT} type="email" value={f.email} onChange={(e) => upd({ email: e.target.value })} />
                  </label>
                  <label className={LBL}>
                    Street address
                    <input className={INPUT} value={f.street} onChange={(e) => upd({ street: e.target.value })} />
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <label className={LBL}>
                    Suburb (shown)
                    <input className={INPUT} value={f.suburb} onChange={(e) => upd({ suburb: e.target.value })} />
                  </label>
                  <label className={LBL}>
                    State
                    <select className={INPUT} value={f.state} onChange={(e) => upd({ state: e.target.value })}>
                      {STATES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label className={LBL}>
                    Postcode
                    <input
                      className={INPUT}
                      inputMode="numeric"
                      maxLength={4}
                      value={f.pc}
                      onChange={(e) => upd({ pc: e.target.value })}
                    />
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <label className={LBL}>
                    Roof
                    <select className={INPUT} value={f.roof} onChange={(e) => upd({ roof: e.target.value })}>
                      {ROOFS.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label className={LBL}>
                    Storeys
                    <select className={INPUT} value={f.storeys} onChange={(e) => upd({ storeys: e.target.value })}>
                      <option>Single storey</option>
                      <option>Double storey</option>
                      <option>Three storey</option>
                    </select>
                  </label>
                  <label className={LBL}>
                    Supply
                    <select className={INPUT} value={f.phase} onChange={(e) => upd({ phase: e.target.value })}>
                      <option>Single phase</option>
                      <option>Three phase</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className={CARD}>
                <div className="flex items-center gap-2.5">
                  <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[#0B1A2E] text-[13px] font-bold text-white">
                    3
                  </span>
                  <h2 className="m-0 flex-grow text-[16px] font-bold text-[#0F172A]">
                    What the customer has confirmed
                  </h2>
                  <span
                    className="rounded-full px-2.5 py-[3px] text-[11px] font-bold"
                    style={{
                      background: noConf ? "#FEE2E2" : "#DCFCE7",
                      color: noConf ? "#B91C1C" : "#166534",
                    }}
                  >
                    {confLabel}
                  </span>
                </div>
                <label className="flex items-start gap-2.5 text-[13px] leading-[1.4] text-[#334155]">
                  <input
                    type="checkbox"
                    checked={f.payConf}
                    onChange={() => upd({ payConf: !f.payConf })}
                    className="mt-px size-[18px] shrink-0 accent-[#F68A0A]"
                  />
                  <span>
                    <strong>Payment confirmed</strong>
                    <br />A deposit or full payment has been received and is held by EasyLink until
                    the installer buys the site.
                  </span>
                </label>
                {f.payConf ? (
                  <div className="grid grid-cols-3 gap-2.5 pl-7">
                    <label className={LBL}>
                      Amount received ($)
                      <input
                        className={INPUT}
                        inputMode="numeric"
                        value={f.paid}
                        onChange={(e) =>
                          upd({ paid: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 })
                        }
                      />
                    </label>
                    <label className={LBL}>
                      Method
                      <select className={INPUT} value={f.payMethod} onChange={(e) => upd({ payMethod: e.target.value })}>
                        <option>Card · Stripe</option>
                        <option>Bank transfer</option>
                        <option>Finance approved</option>
                      </select>
                    </label>
                    <label className={LBL}>
                      Received on
                      <input className={INPUT} type="date" value={f.paidOn} onChange={(e) => upd({ paidOn: e.target.value })} />
                    </label>
                  </div>
                ) : null}
                <label className="flex items-start gap-2.5 text-[13px] leading-[1.4] text-[#334155]">
                  <input
                    type="checkbox"
                    checked={f.instConf}
                    onChange={() => upd({ instConf: !f.instConf })}
                    className="mt-px size-[18px] shrink-0 accent-[#F68A0A]"
                  />
                  <span>
                    <strong>Installation confirmed</strong>
                    <br />
                    The customer has signed the quote and agreed an install window.
                  </span>
                </label>
                {f.instConf ? (
                  <div className="grid grid-cols-2 gap-2.5 pl-7">
                    <label className={LBL}>
                      Install window from
                      <input className={INPUT} type="date" value={f.from} onChange={(e) => upd({ from: e.target.value })} />
                    </label>
                    <label className={LBL}>
                      to
                      <input className={INPUT} type="date" value={f.to} onChange={(e) => upd({ to: e.target.value })} />
                    </label>
                  </div>
                ) : null}
                {noConf ? (
                  <span role="alert" className="text-[13px] font-semibold text-[#B91C1C]">
                    Tick at least one. A Ready Site must have payment or installation confirmed.
                  </span>
                ) : null}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-bold text-[#5B6B80]">
                    Documents attached (installers get these after buying)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {DOCS.map(([k, t]) => {
                      const on = !!f.docs[k];
                      return (
                        <button
                          key={k}
                          type="button"
                          aria-pressed={on}
                          onClick={() => upd({ docs: { ...f.docs, [k]: !on } })}
                          className="h-8 rounded-full border px-3 text-[12px] font-semibold"
                          style={{
                            borderColor: on ? "#166534" : "#CBD5E1",
                            background: on ? "#DCFCE7" : "#FFFFFF",
                            color: on ? "#166534" : "#475569",
                          }}
                        >
                          {on ? "✓" : "+"} {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className={CARD}>
                <div className="flex items-center gap-2.5">
                  <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[#0B1A2E] text-[13px] font-bold text-white">
                    4
                  </span>
                  <h2 className="m-0 flex-grow text-[16px] font-bold text-[#0F172A]">System</h2>
                  <span className="text-[12px] text-[#5B6B80]">
                    {kw} kW · {ratio}% of inverter{" "}
                    {ratio > limitPct ? "· over the " : "· within the "}
                    {dcAcLimitLabel(limitHybridOrBattery)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <label className={LBL}>
                    Panels (AXITEC 440 W)
                    <input
                      className={INPUT}
                      type="number"
                      min={0}
                      max={80}
                      value={f.panels}
                      onChange={(e) => upd({ panels: Number(e.target.value) || 0 })}
                    />
                  </label>
                  <label className={LBL}>
                    Inverter
                    <select className={INPUT} value={f.inv} onChange={(e) => upd({ inv: e.target.value })}>
                      {Object.keys(INV)
                        .filter((k) => k !== "none")
                        .map((k) => (
                          <option key={k} value={k}>
                            {INV[k]![0]}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className={LBL}>
                    Battery
                    <select className={INPUT} value={f.bat} onChange={(e) => upd({ bat: e.target.value })}>
                      {Object.keys(BAT).map((k) => (
                        <option key={k} value={k}>
                          {BAT[k]![0]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-start gap-2.5 text-[13px] text-[#334155]">
                    <input type="checkbox" checked={f.ev} onChange={() => upd({ ev: !f.ev })} className="mt-px size-[18px] accent-[#F68A0A]" />
                    EV charger · zappi 7 kW
                  </label>
                  <label className="flex items-start gap-2.5 text-[13px] text-[#334155]">
                    <input type="checkbox" checked={f.hp} onChange={() => upd({ hp: !f.hp })} className="mt-px size-[18px] accent-[#F68A0A]" />
                    Heat pump · Reclaim 270 L
                  </label>
                </div>
                <label className="flex items-start gap-2.5 text-[13px] leading-[1.4] text-[#334155]">
                  <input type="checkbox" checked={f.supply} onChange={() => upd({ supply: !f.supply })} className="mt-px size-[18px] shrink-0 accent-[#F68A0A]" />
                  <span>
                    Equipment supplied by [Distributor] Pty Ltd and delivered to site (installer
                    doesn&apos;t order stock)
                  </span>
                </label>
              </section>

              <section className={CARD}>
                <div className="flex items-center gap-2.5">
                  <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[#0B1A2E] text-[13px] font-bold text-white">
                    5
                  </span>
                  <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Money</h2>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <label className={LBL}>
                    Customer contract ($ incl GST)
                    <input
                      className={INPUT}
                      inputMode="numeric"
                      value={f.contract}
                      onChange={(e) =>
                        upd({ contract: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 })
                      }
                    />
                  </label>
                  <label className={LBL}>
                    Site fee model
                    <select className={INPUT} value={f.feeModel} onChange={(e) => upd({ feeModel: e.target.value })}>
                      <option value="fixed">Fixed fee</option>
                      <option value="pct">% of contract</option>
                      <option value="offer">Best offer in 24 h</option>
                    </select>
                  </label>
                  <label className={LBL}>
                    {feeLabel}
                    <input
                      className={INPUT}
                      inputMode="decimal"
                      value={f.feeModel === "pct" ? f.pct : f.fee}
                      onChange={(e) => {
                        const v = Number(e.target.value.replace(/[^0-9.]/g, "")) || 0;
                        upd(f.feeModel === "pct" ? { pct: v } : { fee: v });
                      }}
                    />
                  </label>
                </div>
                <div
                  className="grid gap-2.5"
                  style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}
                >
                  {moneyCards.map((m) => (
                    <div key={m.l} className="flex flex-col gap-0.5 rounded-[10px] bg-[#F8FAFC] p-3">
                      <span className="text-[12px] text-[#5B6B80]">{m.l}</span>
                      <strong className="text-[17px] text-[#0F172A]">{m.v}</strong>
                      <span className="text-[12px] text-[#5B6B80]">{m.s}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className={CARD}>
                <div className="flex items-center gap-2.5">
                  <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[#0B1A2E] text-[13px] font-bold text-white">
                    6
                  </span>
                  <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">
                    Listing &amp; who sees it
                  </h2>
                </div>
                <label className={LBL}>
                  Headline on the website
                  <input className={INPUT} value={title} onChange={(e) => upd({ title: e.target.value })} />
                </label>
                <label className="flex items-start gap-2.5 text-[13px] leading-[1.4] text-[#334155]">
                  <input type="checkbox" checked={f.web} onChange={() => upd({ web: !f.web })} className="mt-px size-[18px] shrink-0 accent-[#F68A0A]" />
                  <span>
                    <strong>Post on easylinksolar.com.au → Ready Sites</strong>
                    <br />
                    Public card shows suburb, system, confirmation and money only.
                  </span>
                </label>
                <label className="flex items-start gap-2.5 text-[13px] leading-[1.4] text-[#334155]">
                  <input type="checkbox" checked={f.portal} onChange={() => upd({ portal: !f.portal })} className="mt-px size-[18px] shrink-0 accent-[#F68A0A]" />
                  <span>
                    <strong>Highlight in the Installer portal</strong>
                    <br />
                    Banner on Home, a badge on the menu, plus SMS and push to matching installers.
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <label className={LBL}>
                    Offer to
                    <select className={INPUT} value={f.aud} onChange={(e) => upd({ aud: e.target.value })}>
                      <option value="area">Installers who service {f.pc}</option>
                      <option value="50">Installers within 50 km</option>
                      <option value="state">All installers in {f.state}</option>
                    </select>
                  </label>
                  <label className={LBL}>
                    Elite head start
                    <select className={INPUT} value={f.head} onChange={(e) => upd({ head: e.target.value })}>
                      <option value="0">None</option>
                      <option value="6">Elite only for 6 h</option>
                      <option value="12">Elite only for 12 h</option>
                    </select>
                  </label>
                  <label className={LBL}>
                    Listing ends
                    <input className={INPUT} type="date" value={f.expiry} onChange={(e) => upd({ expiry: e.target.value })} />
                  </label>
                </div>
                <label className="flex items-start gap-2.5 text-[13px] leading-[1.4] text-[#334155]">
                  <input type="checkbox" checked={f.accred} onChange={() => upd({ accred: !f.accred })} className="mt-px size-[18px] shrink-0 accent-[#F68A0A]" />
                  <span>
                    Only installers with SAA accreditation for{" "}
                    {bat[1] ? "grid-connect PV + battery" : "grid-connect PV"}
                  </span>
                </label>
                <label className={LBL}>
                  Notes for the installer (shown after purchase)
                  <textarea
                    className={`${INPUT} h-auto resize-y py-2`}
                    rows={2}
                    value={f.notes}
                    onChange={(e) => upd({ notes: e.target.value })}
                  />
                </label>
                <div className="flex flex-wrap justify-end gap-2.5">
                  <button type="button" onClick={() => save("Draft")} className={BTN}>
                    Save draft
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!noConf) save("Live");
                    }}
                    disabled={cantPublish}
                    title={
                      cantPublish
                        ? "Tick a confirmation and fill in suburb and postcode first"
                        : undefined
                    }
                    className="inline-flex h-11 items-center rounded-[10px] bg-[#F68A0A] px-4 text-[14px] font-bold text-[#3B1D00] disabled:cursor-not-allowed disabled:bg-[#E2E8F0] disabled:text-[#475569]"
                  >
                    Publish Ready Site
                  </button>
                </div>
              </section>
            </div>

            <aside aria-label="Preview" className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4">
              <section className={CARD}>
                <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">
                  Website card · easylinksolar.com.au/ready-sites
                </h2>
                <div className="flex flex-col gap-2.5 rounded-[16px] bg-[#0B1A2E] p-[18px] text-white">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="whitespace-nowrap rounded-full bg-[#F68A0A] px-2.5 py-[3px] text-[11px] font-bold text-[#3B1D00]">
                      READY SITE · {kw} kW
                    </span>
                    {badges.map((b) => (
                      <span
                        key={b}
                        className="whitespace-nowrap rounded-full bg-[#7EE2A0] px-2.5 py-[3px] text-[11px] font-bold text-[#0B2A17]"
                      >
                        ✓ {b}
                      </span>
                    ))}
                  </div>
                  <strong className="font-source-sans text-[22px] leading-[1.2]">{title}</strong>
                  <span className="text-[13px] leading-[1.45] text-[#E6EDF7]">{equip}</span>
                  <span className="text-[13px] text-[#9FB0C8]">
                    {f.roof} · {f.storeys} · {f.phase} ·{" "}
                    {f.instConf ? `install ${dfmt(f.from)}–${dfmt(f.to)}` : "install date open"}
                  </span>
                  <div className="flex flex-wrap items-end gap-4">
                    <span className="flex flex-col">
                      <span className="text-[11px] text-[#9FB0C8]">Customer contract</span>
                      <strong className="text-[20px]">{money(f.contract)}</strong>
                    </span>
                    <span className="flex flex-col">
                      <span className="text-[11px] text-[#9FB0C8]">Site fee</span>
                      <strong className="text-[20px] text-[#FFE866]">{money(fee)}</strong>
                    </span>
                    <span className="ml-auto inline-flex h-10 items-center rounded-[10px] bg-[#F68A0A] px-4 text-[14px] font-bold text-[#3B1D00]">
                      Installer sign in to buy
                    </span>
                  </div>
                </div>
              </section>

              <section className={CARD}>
                <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">
                  Installer portal highlight
                </h2>
                <div
                  className="rounded-[14px] p-0.5"
                  style={{ background: "linear-gradient(135deg, #FFE866, #F68A0A)" }}
                >
                  <div className="flex flex-col gap-1.5 rounded-[12px] bg-white p-3.5">
                    <span className="flex items-center gap-2">
                      <span className="whitespace-nowrap rounded-full bg-[#F68A0A] px-2.5 py-[3px] text-[11px] font-bold text-[#3B1D00]">
                        NEW READY SITE
                      </span>
                      <span className="flex-grow text-[12px] text-[#5B6B80]">
                        {f.suburb} {f.pc} · in your service area
                      </span>
                    </span>
                    <strong className="text-[15px] text-[#0F172A]">{title}</strong>
                    <span className="text-[13px] text-[#475569]">
                      {confLabel} · contract {money(f.contract)} · fee {money(fee)}
                    </span>
                  </div>
                </div>
              </section>

              <section className={CARD}>
                <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">What installers see</h2>
                <div className="grid grid-cols-2 gap-x-3.5 gap-y-2">
                  <span className="text-[12px] font-bold text-[#5B6B80]">Before buying</span>
                  <span className="text-[12px] font-bold text-[#5B6B80]">After buying</span>
                  <span className="text-[12px] text-[#475569]">✓ Suburb, postcode</span>
                  <span className="text-[12px] text-[#475569]">🔒 {f.name}</span>
                  <span className="text-[12px] text-[#475569]">✓ System &amp; roof</span>
                  <span className="text-[12px] text-[#475569]">
                    🔒 {f.mob} · {f.email}
                  </span>
                  <span className="text-[12px] text-[#475569]">✓ What&apos;s confirmed</span>
                  <span className="text-[12px] text-[#475569]">🔒 {f.street}</span>
                  <span className="text-[12px] text-[#475569]">✓ Contract &amp; fee</span>
                  <span className="text-[12px] text-[#475569]">🔒 {docCount} documents</span>
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
