"use client";

import Link from "next/link";
import { useState } from "react";

import {
  BATTERY_FACTORS,
  DEEMING_YEARS,
  QUOTE_DEFAULTS,
  SAMPLE_PRICE_BOOK,
  ZONE_RATINGS,
  type Battery,
  type Extra,
  type Inverter,
  type Panel,
  type PriceBook,
  type Settings,
  auDate,
  batteryFactorFor,
  batteryStcs,
  deemingYearsFor,
  money,
  panelStcEstimate,
  rate,
  sellIncGst,
  tradePrice,
} from "@/lib/pricing/quote-engine";

/**
 * Matches the Easylink Designer "Price book & rules" mock (DistPriceBook.dc.html
 * + PricingBody.dc.html, role "operations", screen "book") — the costs, margins
 * and CER rules the quote tester prices against.
 *
 * The book is editable here and every derived column recomputes as you type:
 * trade price, installed inc GST, certificates and net installed. Edits are
 * draft-only and live in component state; publishing is not wired to anything,
 * because this app has no price book to publish yet.
 *
 * The STC columns are evaluated for one site — the quote tester's default zone
 * and install date — since certificates depend on both.
 */

const SUNRISE = "linear-gradient(90deg, #FFE866, #F68A0A)";
const BORDER = "#E3E8EF";
const SUN = "#F68A0A";
const SUN_SOFT = "#FFF4DC";
const SUN_INK = "#3B1D00";
/** Shown where a column has no value for this row. */
const DASH = "—";

const TH =
  "border-b border-[#E3E8EF] bg-[#F8FAFC] px-2.5 py-2 text-[11px] font-bold uppercase tracking-[0.06em] text-[#5B6B80] whitespace-nowrap";
const TD = "border-b border-[#EEF2F6] px-2.5 py-[9px] align-middle text-[13px] whitespace-nowrap";
const NUM = "text-right tabular-nums";
const EYE = "text-[11px] font-bold uppercase tracking-[0.07em] text-[#5B6B80]";
const SUB = "text-[12px] leading-[1.45] text-[#5B6B80]";
const INPUT =
  "h-10 w-full min-w-0 box-border rounded-[10px] border border-[#CBD5E1] bg-white px-2.5 text-[14px] text-[#0F172A]";
const CELL =
  "h-8 w-[82px] box-border rounded-lg border border-[#CBD5E1] bg-white px-2 text-right text-[13px] tabular-nums text-[#0F172A]";
const NAME =
  "h-8 w-[200px] box-border rounded-lg border border-[#CBD5E1] bg-white px-2 text-[13px] text-[#0F172A]";
const BTN =
  "inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] border border-[#CBD5E1] bg-white px-3.5 text-[13px] font-semibold text-[#0F172A]";
const BTN_SM = "h-8 px-2.5 text-[12px]";

/** The settings grid, in the mock's order. */
const SETTING_FIELDS: [keyof Settings, string, string][] = [
  ["margin", "EasyLink margin on cost", "%"],
  ["trade", "Installer trade margin", "% on cost"],
  ["gst", "GST", "%"],
  ["stcPrice", "STC price passed on", "$ / STC"],
  ["jobFixed", "Design, permits, metering", "$ cost"],
  ["threePhase", "Three-phase works", "$ cost"],
  ["delivery", "Delivery, supply only", "$ cost"],
  ["singleMax", "Single-phase inverter limit", "kW"],
  ["threeMax", "Three-phase inverter limit", "kW"],
  ["dcac", "Max DC:AC ratio", "×"],
];

type SectionKey = "panels" | "inverters" | "batteries" | "extras";
type Row = Panel | Inverter | Battery | Extra;

const PUBLISHED = "PB-2026-10 · published 17 Oct 2026";

type LogEntry = { version: string; what: string; when: string };

const HISTORY: LogEntry[] = [
  {
    version: "PB-2026-10",
    what: "Battery factor 6.8 from 1 May 2026, tiered bands",
    when: "17 Oct 2026 · Daniel Shaw",
  },
  { version: "PB-2026-09", what: "Hybrid inverter costs +4%", when: "12 Sep 2026 · Mark Kelly" },
  { version: "PB-2026-07", what: "STC price $37.50 net", when: "3 Jul 2026 · Daniel Shaw" },
];

function Card({ label, children, bare }: { label: string; children: React.ReactNode; bare?: boolean }) {
  return (
    <section
      aria-label={label}
      className={`flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-[#E3E8EF] bg-white ${
        bare ? "p-0" : "gap-3 p-[18px]"
      }`}
    >
      {children}
    </section>
  );
}

function num(value: string): number {
  const n = parseFloat(value);
  return Number.isNaN(n) ? 0 : n;
}

export function MasterPriceBook() {
  const [pb, setPb] = useState<PriceBook>(SAMPLE_PRICE_BOOK);
  const [draftCount, setDraftCount] = useState(0);
  const [live, setLive] = useState(PUBLISHED);
  const [log, setLog] = useState<LogEntry[]>(HISTORY);
  const [effectiveFrom, setEffectiveFrom] = useState("2026-11-01");
  const [msg, setMsg] = useState("");

  const s = pb.settings;
  // Certificates depend on a site, so the STC columns are evaluated against
  // the quote tester's default zone and install date.
  const { zone, date } = QUOTE_DEFAULTS;
  const years = deemingYearsFor(date);
  const factor = batteryFactorFor(date);

  /** Every edit bumps the draft count, which is what "not published" counts. */
  const draft = (next: PriceBook) => {
    setPb(next);
    setDraftCount((n) => n + 1);
    setMsg("");
  };

  const setSetting = (key: keyof Settings, value: number) =>
    draft({ ...pb, settings: { ...s, [key]: value } });

  const editRow = (key: SectionKey, index: number, field: string, value: string | number) =>
    draft({
      ...pb,
      [key]: pb[key].map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    } as PriceBook);

  const removeRow = (key: SectionKey, index: number) =>
    draft({ ...pb, [key]: pb[key].filter((_, i) => i !== index) } as PriceBook);

  const addRow = (key: SectionKey, blank: Row) =>
    draft({ ...pb, [key]: [...pb[key], blank] } as PriceBook);

  /** Certificates a row earns, or null where the item can't earn any. */
  const stcsFor = (key: SectionKey, row: Row): number | null => {
    if (key === "panels") return panelStcEstimate((row as Panel).w, zone, date);
    if (key === "batteries") return batteryStcs((row as Battery).kwh, date).count;
    return null;
  };

  const sections: {
    key: SectionKey;
    title: string;
    one: string;
    note: string;
    spec: (r: Row) => string;
    blank: () => Row;
  }[] = [
    {
      key: "panels",
      title: "Panels",
      one: "panel",
      note: "STCs per panel are indicative: a system’s total is rounded down once.",
      spec: (r) => `${(r as Panel).w} W`,
      blank: () => ({ id: `p${Date.now()}`, model: "New panel", w: 440, supply: 100, install: 85 }),
    },
    {
      key: "inverters",
      title: "Inverters",
      one: "inverter",
      note: "Inverters earn no STCs on their own.",
      spec: (r) => {
        const i = r as Inverter;
        return `${i.kind} · ${i.kw} kW · ${i.phase}-phase`;
      },
      blank: () => ({
        id: `i${Date.now()}`,
        kind: "Hybrid" as const,
        model: "New inverter",
        kw: 10,
        phase: 1 as const,
        supply: 2000,
        install: 400,
      }),
    },
    {
      key: "batteries",
      title: "Batteries",
      one: "battery",
      note: "Battery STCs use usable kWh, tiered 100 / 60 / 15%, nothing above 50 kWh.",
      spec: (r) => `${(r as Battery).kwh} kWh usable`,
      blank: () => ({
        id: `b${Date.now()}`,
        model: "New battery",
        kwh: 10,
        supply: 4300,
        install: 1100,
      }),
    },
    {
      key: "extras",
      title: "Extras and adders",
      one: "extra",
      note: "Per-panel extras multiply by the panel count.",
      spec: (r) => `per ${(r as Extra).per}`,
      blank: () => ({
        id: `x${Date.now()}`,
        label: "New extra",
        per: "job" as const,
        supply: 0,
        install: 0,
      }),
    },
  ];

  const publish = () => {
    const version = "PB-2026-11";
    const plural = draftCount === 1 ? "" : "s";
    setLive(`${version} · takes effect ${auDate(effectiveFrom)}`);
    setLog((prev) => [
      {
        version,
        what: `${draftCount} change${plural} · margin ${s.margin}%, trade ${s.trade}%, STC ${rate(s.stcPrice)}`,
        when: "Today · Daniel Shaw",
      },
      ...prev,
    ]);
    setDraftCount(0);
    setMsg(
      `${version} published. Installers see the new trade prices from ${auDate(effectiveFrom)}; quotes already sent keep their old prices.`,
    );
  };

  const discard = () => {
    setPb(SAMPLE_PRICE_BOOK);
    setDraftCount(0);
    setMsg("Draft discarded.");
  };

  return (
    <div className="flex min-h-full flex-col text-[#0F172A]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          <Link href="/master/quote-tester" className="text-[#5B6B80] hover:underline">
            Pricing engine
          </Link>{" "}
          <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Price book &amp; rules</span>
        </nav>
        <span className="rounded-full bg-[#DBEAFE] px-2.5 py-[3px] text-[12px] font-bold text-[#1E40AF]">
          Sample price book
        </span>
        <span
          className="rounded-full px-2.5 py-[3px] text-[12px] font-bold"
          style={{ background: SUNRISE, color: SUN_INK }}
        >
          Pricing engine
        </span>
      </header>

      <div className="flex w-full max-w-[1440px] flex-col gap-[18px] px-8 pb-14 pt-6">
        <div className="flex flex-wrap items-end gap-3.5">
          <div className="min-w-0 flex-[1_1_420px]">
            <h1 className="m-0 font-source-sans text-[28px] font-bold">Price book &amp; rules</h1>
            <p className="mb-0 mt-1 text-[13px] text-[#5B6B80]">
              Supply and install costs for every item, margins, STC price and the CER rules the
              engine uses
            </p>
          </div>
          <span className="rounded-full bg-[#0B1A2E] px-2.5 py-[3px] text-[11px] font-bold text-white">
            {draftCount ? "Draft · not yet published" : "No unpublished changes"}
          </span>
          <Link href="/master/quote-tester" className={BTN}>
            Quote tester
          </Link>
          <Link href="/master/products-pricing" className={BTN}>
            Pricing &amp; stock
          </Link>
        </div>

        {msg ? (
          <div
            role="status"
            className="rounded-[12px] bg-[#DCFCE7] px-3.5 py-[11px] text-[14px] font-semibold text-[#166534]"
          >
            {msg}
          </div>
        ) : null}

        {/* ------------------------------------------------- settings */}
        <Card label="Settings">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h2 className="m-0 flex-grow text-[16px] font-bold">Pricing settings</h2>
            <span className={SUB}>
              STC columns use Zone {zone}, install {auDate(date)} ({years} deeming yrs, battery
              factor {factor}). STC price {rate(s.stcPrice)} set by EasyLink.
            </span>
          </div>
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))" }}
          >
            {SETTING_FIELDS.map(([key, label, unit]) => (
              <label
                key={key}
                className="flex min-w-0 flex-col gap-1 text-[12px] font-semibold text-[#334155]"
              >
                <span>
                  {label} <span className={SUB}>({unit})</span>
                </span>
                <input
                  type="number"
                  step="any"
                  className={`${INPUT} tabular-nums`}
                  value={s[key] as number}
                  onChange={(e) => setSetting(key, num(e.target.value))}
                />
              </label>
            ))}
          </div>
          <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-[1.4] text-[#334155]">
            <input
              type="checkbox"
              checked={s.supplyOnlyStc}
              onChange={(e) =>
                draft({ ...pb, settings: { ...s, supplyOnlyStc: e.target.checked } })
              }
              className="mt-px size-[18px] shrink-0 accent-[#F68A0A]"
            />
            <span>
              Allow STCs on supply-only jobs (the customer&rsquo;s own accredited installer creates
              them)
            </span>
          </label>
        </Card>

        {/* ------------------------------------------------- the book */}
        {sections.map((sec) => {
          const rows = pb[sec.key];
          const nameKey = sec.key === "extras" ? "label" : "model";
          return (
            <Card bare key={sec.key} label={sec.title}>
              <div className="flex flex-wrap items-center gap-2.5 px-[18px] py-3.5">
                <h2 className="m-0 text-[16px] font-bold">{sec.title}</h2>
                <span className={`${SUB} flex-grow`}>{sec.note}</span>
                <button
                  type="button"
                  className={`${BTN} ${BTN_SM}`}
                  onClick={() => addRow(sec.key, sec.blank())}
                >
                  Add {sec.one}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse">
                  <thead>
                    <tr>
                      <th className={`${TH} text-left`}>Item</th>
                      <th className={`${TH} text-left`}>Spec</th>
                      <th className={`${TH} text-right`}>Supply cost</th>
                      <th className={`${TH} text-right`}>Install cost</th>
                      <th className={`${TH} text-right`}>Trade price</th>
                      <th className={`${TH} text-right`}>Installed inc GST</th>
                      <th className={`${TH} text-right`}>STCs</th>
                      <th className={`${TH} text-right`}>Net installed</th>
                      <th className={`${TH} text-left`} />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const stcs = stcsFor(sec.key, r);
                      const installed = sellIncGst(r.supply + r.install, s);
                      const net = installed - (stcs ?? 0) * s.stcPrice;
                      const name = (r as Panel & Extra)[nameKey as "model"] ?? "";
                      return (
                        <tr key={r.id}>
                          <td className={TD}>
                            <input
                              aria-label="Name"
                              className={NAME}
                              value={name}
                              onChange={(e) => editRow(sec.key, i, nameKey, e.target.value)}
                            />
                          </td>
                          <td className={`${TD} ${SUB}`}>{sec.spec(r)}</td>
                          <td className={`${TD} ${NUM}`}>
                            <input
                              type="number"
                              step="any"
                              aria-label="Supply cost"
                              className={CELL}
                              value={r.supply}
                              onChange={(e) => editRow(sec.key, i, "supply", num(e.target.value))}
                            />
                          </td>
                          <td className={`${TD} ${NUM}`}>
                            <input
                              type="number"
                              step="any"
                              aria-label="Install cost"
                              className={CELL}
                              value={r.install}
                              onChange={(e) => editRow(sec.key, i, "install", num(e.target.value))}
                            />
                          </td>
                          <td className={`${TD} ${NUM}`}>{money(tradePrice(r.supply, s))}</td>
                          <td className={`${TD} ${NUM}`}>{money(installed)}</td>
                          <td
                            className={`${TD} ${NUM}`}
                            style={{ background: stcs === null ? undefined : SUN_SOFT }}
                          >
                            {stcs === null
                              ? DASH
                              : sec.key === "panels"
                                ? stcs.toFixed(2)
                                : String(stcs)}
                          </td>
                          <td className={`${TD} ${NUM}`}>{stcs === null ? DASH : money(net)}</td>
                          <td className={TD}>
                            {/* The EV charger is wired to the EV system type, so it can't go. */}
                            {r.id !== "ev" && rows.length > 1 ? (
                              <button
                                type="button"
                                className={`${BTN} ${BTN_SM} text-[#991B1B]`}
                                onClick={() => removeRow(sec.key, i)}
                              >
                                Remove
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}

        {/* ------------------------------------------------- rules + publish */}
        <div
          className="grid items-start gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))" }}
        >
          <Card label="STC rules">
            <div className="flex flex-wrap items-baseline gap-2.5">
              <h2 className="m-0 flex-grow text-[16px] font-bold">STC rules in force</h2>
              <span className="rounded-full bg-[#DBEAFE] px-[9px] py-[3px] text-[11px] font-bold text-[#1E40AF]">
                Clean Energy Regulator
              </span>
            </div>
            <span className={SUB}>
              Solar STCs = &lfloor;array kW × zone rating × deeming years&rfloor;. Battery STCs =
              &lfloor;tiered usable kWh × factor&rfloor;, locked on the installation date. Check the
              battery factor each January and July.
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <span className={EYE}>Zone ratings (MWh/kW)</span>
                {[1, 2, 3, 4].map((z) => (
                  <div key={z} className="flex justify-between text-[13px]">
                    <span>Zone {z}</span>
                    <strong className="tabular-nums">{ZONE_RATINGS[z]}</strong>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                <span className={EYE}>Solar deeming years</span>
                {Object.entries(DEEMING_YEARS).map(([year, yrs]) => (
                  <div
                    key={year}
                    className="flex justify-between text-[13px]"
                    // The install year in play is called out.
                    style={{ fontWeight: Number(year) === Number(date.slice(0, 4)) ? 700 : 400 }}
                  >
                    <span>Installed in {year}</span>
                    <span className="tabular-nums">{yrs} yrs</span>
                  </div>
                ))}
              </div>
            </div>

            <span className={EYE}>Battery STC factor by installation date</span>
            <div
              className="grid gap-1.5"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}
            >
              {BATTERY_FACTORS.map(([from, to, value]) => {
                const current = date >= from && date <= to;
                return (
                  <div
                    key={from}
                    className="rounded-[10px] px-2.5 py-2 text-[12px]"
                    style={{
                      border: `1px solid ${current ? SUN : BORDER}`,
                      background: current ? SUN_SOFT : "#FFFFFF",
                    }}
                  >
                    <span className={SUB}>
                      {auDate(from)} &ndash; {auDate(to)}
                    </span>
                    <br />
                    <strong className="text-[15px] tabular-nums">{value}</strong>
                  </div>
                );
              })}
            </div>

            <span className={SUB}>
              Usable kWh bands: first 14 kWh at 100%, 14&ndash;28 kWh at 60%, 28&ndash;50 kWh at
              15%, nothing above 50 kWh. Batteries under 5 kWh usable get none. Battery-only jobs
              need existing solar on site. Inverter swaps and EV chargers earn no STCs.
            </span>
          </Card>

          <Card label="Publish">
            <h2 className="m-0 text-[16px] font-bold">Publish to installers</h2>
            <span className={SUB}>
              Installers quote from the published book: they see trade prices (EasyLink cost + trade
              margin), never EasyLink cost or margin. Drafts change nothing until published.
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-[10px] bg-[#F8FAFC] p-3">
                <span className={SUB}>Live for installers</span>
                <br />
                <strong>{live}</strong>
              </div>
              <div className="rounded-[10px] bg-[#F8FAFC] p-3">
                <span className={SUB}>This draft</span>
                <br />
                <strong>
                  {draftCount
                    ? `${draftCount} change${draftCount === 1 ? "" : "s"} not published`
                    : "No changes yet"}
                </strong>
              </div>
            </div>
            <label className="flex min-w-0 flex-col gap-1 text-[12px] font-semibold text-[#334155]">
              <span>Takes effect</span>
              <input
                type="date"
                className={INPUT}
                value={effectiveFrom}
                onChange={(e) => {
                  if (e.target.value) setEffectiveFrom(e.target.value);
                }}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`${BTN} border-0 font-bold`}
                style={{ background: SUNRISE, color: SUN_INK }}
                onClick={publish}
              >
                Publish price book
              </button>
              <button type="button" className={BTN} onClick={discard}>
                Discard draft
              </button>
            </div>
            <span className={SUB}>
              Publishing is not wired up yet — this screen edits a draft in your browser only.
            </span>

            <span className={EYE}>History</span>
            {log.map((h) => (
              <div
                key={h.version + h.when}
                className="flex gap-2.5 border-b border-[#EEF2F6] py-1.5 text-[13px]"
              >
                <strong className="min-w-[110px]">{h.version}</strong>
                <span className="flex-grow">{h.what}</span>
                <span className={SUB}>{h.when}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
