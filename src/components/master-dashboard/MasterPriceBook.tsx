"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  BATTERY_FACTORS,
  DEEMING_YEARS,
  QUOTE_DEFAULTS,
  ZONE_RATINGS,
  type Battery,
  type EvCharger,
  type Extra,
  type Inverter,
  type Panel,
  type PriceBook,
  type Settings,
  auDate,
  batteryFactorFor,
  batteryInstall,
  batteryStcs,
  deemingYearsFor,
  itemPrice,
  money,
  panelStcEstimate,
  rate,
  tradePrice,
} from "@/lib/pricing/quote-engine";
import { priceBookLabel, useAdminPriceBook } from "@/lib/pricing/useAdminPriceBook";

/**
 * Master portal · Price book & rules — the live book the pricing engine v2
 * prices every quote from (website Designs page, quote tester).
 *
 * The book is loaded from the backend (GET /api/admin/pricing/price-book) and
 * saved back with "Publish price book" (PUT). The website's customer prices
 * use a published book straight away. Edits are a draft until published.
 *
 * Costs are trade prices ex GST. Item price = cost × (1 + margin) × (1 + GST).
 * Installation is EasyLink's rate, charged as entered (inc GST, no margin):
 * panels per watt, inverter with panels, battery base + steps, EV charger,
 * inverter swap; extras carry their own installation price.
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
  "h-8 w-[88px] box-border rounded-lg border border-[#CBD5E1] bg-white px-2 text-right text-[13px] tabular-nums text-[#0F172A]";
const NAME =
  "h-8 w-[260px] box-border rounded-lg border border-[#CBD5E1] bg-white px-2 text-[13px] text-[#0F172A]";
const SUPPLIER =
  "h-8 w-[130px] box-border rounded-lg border border-[#CBD5E1] bg-white px-2 text-[13px] text-[#0F172A]";
const BTN =
  "inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] border border-[#CBD5E1] bg-white px-3.5 text-[13px] font-semibold text-[#0F172A] disabled:cursor-not-allowed disabled:opacity-50";
const BTN_SM = "h-8 px-2.5 text-[12px]";

type NumericSetting = Exclude<keyof Settings, "supplyOnlyStc">;

const PRICING_FIELDS: [NumericSetting, string, string][] = [
  ["margin", "EasyLink margin on equipment", "%"],
  ["trade", "Installer trade margin", "% on cost"],
  ["gst", "GST", "%"],
  ["stcPrice", "STC price passed on", "$ / STC"],
  ["delivery", "Delivery, supply only", "$ inc GST"],
  ["singleMax", "Single-phase inverter limit", "kW"],
  ["threeMax", "Three-phase inverter limit", "kW"],
  ["dcacHybrid", "DC:AC with hybrid or battery", "×"],
  ["dcacStandard", "DC:AC string, no battery", "×"],
];

const INSTALL_FIELDS: [NumericSetting, string, string][] = [
  ["panelPerW", "Panels", "$ per watt"],
  ["invWithPanels", "Inverter, with panels", "$ (0 = free)"],
  ["batteryBase", "Battery, base price", "$"],
  ["batteryBaseKwh", "Battery base covers up to", "kWh"],
  ["batteryStep", "Battery, each step above", "$"],
  ["batteryStepKwh", "Battery step size", "kWh"],
  ["evInstall", "EV charger", "$"],
  ["invSwap", "Inverter swap", "$"],
  ["threePhase", "Three-phase works", "$ (0 = none)"],
];

type SectionKey = "panels" | "inverters" | "batteries" | "evChargers" | "extras";
type Row = Panel | Inverter | Battery | EvCharger | Extra;

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

function SettingsGrid({
  fields,
  s,
  onChange,
}: {
  fields: [NumericSetting, string, string][];
  s: Settings;
  onChange: (key: NumericSetting, value: number) => void;
}) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))" }}>
      {fields.map(([key, label, unit]) => (
        <label key={key} className="flex min-w-0 flex-col gap-1 text-[12px] font-semibold text-[#334155]">
          <span>
            {label} <span className={SUB}>({unit})</span>
          </span>
          <input
            type="number"
            step="any"
            className={`${INPUT} tabular-nums`}
            value={(s[key] as number | undefined) ?? 0}
            onChange={(e) => onChange(key, num(e.target.value))}
          />
        </label>
      ))}
    </div>
  );
}

export function MasterPriceBook() {
  const live = useAdminPriceBook();
  const [pb, setPb] = useState<PriceBook>(live.book);
  const [draftCount, setDraftCount] = useState(0);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");

  // A fresh load (first open, publish, discard) replaces the draft.
  useEffect(() => {
    setPb(live.book);
    setDraftCount(0);
  }, [live.book]);

  const s = pb.settings;
  const { zone, date } = QUOTE_DEFAULTS;
  const years = deemingYearsFor(date);
  const factor = batteryFactorFor(date);
  const canPublish = live.source !== "sample" && !live.loading;

  const draft = (next: PriceBook) => {
    setPb(next);
    setDraftCount((n) => n + 1);
    setMsg(null);
  };

  const setSetting = (key: NumericSetting, value: number) => draft({ ...pb, settings: { ...s, [key]: value } });

  const editRow = (key: SectionKey, id: string, field: string, value: string | number) =>
    draft({ ...pb, [key]: (pb[key] as Row[]).map((r) => (r.id === id ? { ...r, [field]: value } : r)) } as PriceBook);

  const removeRow = (key: SectionKey, id: string) =>
    draft({ ...pb, [key]: (pb[key] as Row[]).filter((r) => r.id !== id) } as PriceBook);

  const addRow = (key: SectionKey, blank: Row) => draft({ ...pb, [key]: [...(pb[key] as Row[]), blank] } as PriceBook);

  /** EasyLink installation price for one of a row, inc GST. */
  const installFor = (key: SectionKey, row: Row): { value: number; label?: string } => {
    switch (key) {
      case "panels":
        return { value: (row as Panel).w * s.panelPerW };
      case "inverters":
        return s.invWithPanels ? { value: s.invWithPanels } : { value: 0, label: "Free with panels" };
      case "batteries":
        return { value: batteryInstall((row as Battery).kwh, s) };
      case "evChargers":
        return { value: s.evInstall };
      default:
        return { value: (row as Extra).install };
    }
  };

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
      note: "Installation at the per-watt rate. STCs per panel are indicative: a system’s total is rounded down once.",
      spec: (r) => `${(r as Panel).w} W`,
      blank: () => ({ id: `p${Date.now()}`, model: "New panel", w: 440, supply: 100, sup: "" }),
    },
    {
      key: "inverters",
      title: "Inverters",
      one: "inverter",
      note: "Installed free with panels; an inverter swap uses the swap rate. Inverters earn no STCs.",
      spec: (r) => {
        const i = r as Inverter;
        return `${i.kind} · ${i.kw} kW · ${i.phase}-phase`;
      },
      blank: () => ({ id: `i${Date.now()}`, kind: "Hybrid" as const, model: "New inverter", kw: 10, phase: 1 as const, supply: 2000, sup: "" }),
    },
    {
      key: "batteries",
      title: "Batteries",
      one: "battery",
      note: "Usable kWh, tiered 100 / 60 / 15%, nothing above 50 kWh. Packages marked “inverter built in” add no separate inverter.",
      spec: (r) => {
        const b = r as Battery;
        return `${b.kwh} kWh usable${b.inv ? ` · inverter built in${b.invKw ? ` ${b.invKw} kW` : ""}` : ""}`;
      },
      blank: () => ({ id: `b${Date.now()}`, model: "New battery", kwh: 10, supply: 4300, sup: "" }),
    },
    {
      key: "evChargers",
      title: "EV chargers",
      one: "EV charger",
      note: "Installed at the EV charger rate. EV chargers earn no STCs.",
      spec: (r) => {
        const e = r as EvCharger;
        return `${e.kw} kW · ${e.phase}-phase`;
      },
      blank: () => ({ id: `e${Date.now()}`, model: "New EV charger", kw: 7, phase: 1 as const, supply: 600, sup: "" }),
    },
    {
      key: "extras",
      title: "Extras and adders",
      one: "extra",
      note: "Installation price is charged as entered (inc GST). Per-panel extras multiply by the panel count.",
      spec: (r) => `per ${(r as Extra).per}`,
      blank: () => ({ id: `x${Date.now()}`, label: "New extra", per: "job" as const, supply: 0, install: 0 }),
    },
  ];

  const needle = filter.trim().toLowerCase();
  const matches = (r: Row) => {
    if (!needle) return true;
    const text = [(r as Panel).model ?? (r as Extra).label, r.sup, r.sku].filter(Boolean).join(" ").toLowerCase();
    return text.includes(needle);
  };

  const total = useMemo(
    () => pb.panels.length + pb.inverters.length + pb.batteries.length + pb.evChargers.length + pb.extras.length,
    [pb],
  );

  const publish = async () => {
    setSaving(true);
    try {
      const saved = await live.save(pb);
      const when = saved.updatedAt ? new Date(saved.updatedAt).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" }) : "now";
      setMsg({ tone: "ok", text: `Price book published ${when}. New website quotes use it straight away.` });
    } catch (e) {
      setMsg({ tone: "err", text: e instanceof Error ? e.message : "Couldn't publish the price book." });
    } finally {
      setSaving(false);
    }
  };

  const discard = async () => {
    await live.reload();
    setMsg({ tone: "ok", text: "Draft discarded — showing the published book." });
  };

  return (
    <div className="flex min-h-full flex-col text-[#0F172A]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          <Link href="/master/quote-tester" className="text-[#5B6B80] hover:underline">
            Pricing engine
          </Link>{" "}
          <span aria-hidden="true">/</span> <span className="font-semibold text-[#0F172A]">Price book &amp; rules</span>
        </nav>
        <span
          className="rounded-full px-2.5 py-[3px] text-[12px] font-bold"
          style={
            live.source === "sample"
              ? { background: "#FEF3C7", color: "#92400E" }
              : { background: "#DCFCE7", color: "#166534" }
          }
        >
          {priceBookLabel(live.source, live.updatedAt, live.loading)}
        </span>
        <span className="rounded-full px-2.5 py-[3px] text-[12px] font-bold" style={{ background: SUNRISE, color: SUN_INK }}>
          Pricing engine v2
        </span>
      </header>

      <div className="flex w-full max-w-[1440px] flex-col gap-[18px] px-8 pb-14 pt-6">
        <div className="flex flex-wrap items-end gap-3.5">
          <div className="min-w-0 flex-[1_1_420px]">
            <h1 className="m-0 font-source-sans text-[28px] font-bold">Price book &amp; rules</h1>
            <p className="mb-0 mt-1 text-[13px] text-[#5B6B80]">
              Trade costs from your suppliers, margins, EasyLink installation rates and the CER rules every quote uses ·{" "}
              {total} items
            </p>
          </div>
          <span className="rounded-full bg-[#0B1A2E] px-2.5 py-[3px] text-[11px] font-bold text-white">
            {draftCount ? `Draft · ${draftCount} change${draftCount === 1 ? "" : "s"} not published` : "No unpublished changes"}
          </span>
          <Link href="/master/quote-tester" className={BTN}>
            Quote tester
          </Link>
          <Link href="/master/products-pricing" className={BTN}>
            Pricing &amp; stock
          </Link>
        </div>

        {live.source === "sample" && !live.loading ? (
          <div role="alert" className="rounded-[12px] bg-[#FEF3C7] px-3.5 py-[11px] text-[14px] font-semibold text-[#92400E]">
            Couldn&rsquo;t load the live price book ({live.error}). Showing sample prices; publishing is off. Sign in as an admin and
            try again.
          </div>
        ) : null}

        {msg ? (
          <div
            role="status"
            className="rounded-[12px] px-3.5 py-[11px] text-[14px] font-semibold"
            style={msg.tone === "ok" ? { background: "#DCFCE7", color: "#166534" } : { background: "#FEE2E2", color: "#991B1B" }}
          >
            {msg.text}
          </div>
        ) : null}

        {/* ------------------------------------------------- settings */}
        <Card label="Settings">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h2 className="m-0 flex-grow text-[16px] font-bold">Pricing settings</h2>
            <span className={SUB}>
              STC columns use Zone {zone}, install {auDate(date)} ({years} deeming yrs, battery factor {factor}).
            </span>
          </div>
          <SettingsGrid fields={PRICING_FIELDS} s={s} onChange={setSetting} />
          <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-[1.4] text-[#334155]">
            <input
              type="checkbox"
              checked={s.supplyOnlyStc}
              onChange={(e) => draft({ ...pb, settings: { ...s, supplyOnlyStc: e.target.checked } })}
              className="mt-px size-[18px] shrink-0 accent-[#F68A0A]"
            />
            <span>Allow STCs on supply-only jobs (the customer&rsquo;s own accredited installer creates them)</span>
          </label>
        </Card>

        <Card label="Installation rates">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h2 className="m-0 flex-grow text-[16px] font-bold">Installation rates</h2>
            <span className={SUB}>
              Charged to the customer as entered, inc GST, no margin. Check: 19 × 440 W ={" "}
              {money(19 * 440 * s.panelPerW)} · 13.5 kWh battery = {money(batteryInstall(13.5, s))} · 40 kWh ={" "}
              {money(batteryInstall(40, s))}
            </span>
          </div>
          <SettingsGrid fields={INSTALL_FIELDS} s={s} onChange={setSetting} />
        </Card>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex min-w-0 flex-[0_1_420px] flex-col gap-1 text-[12px] font-semibold text-[#334155]">
            <span>Find an item</span>
            <input
              type="search"
              className={INPUT}
              placeholder="Model, supplier or SKU — e.g. Sigenergy, SBR"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </label>
        </div>

        {/* ------------------------------------------------- the book */}
        {sections.map((sec) => {
          const all = pb[sec.key] as Row[];
          const rows = all.filter(matches);
          const nameKey = sec.key === "extras" ? "label" : "model";
          return (
            <Card bare key={sec.key} label={sec.title}>
              <div className="flex flex-wrap items-center gap-2.5 px-[18px] py-3.5">
                <h2 className="m-0 text-[16px] font-bold">
                  {sec.title} <span className={SUB}>({needle ? `${rows.length} of ${all.length}` : all.length})</span>
                </h2>
                <span className={`${SUB} flex-grow`}>{sec.note}</span>
                <button type="button" className={`${BTN} ${BTN_SM}`} onClick={() => addRow(sec.key, sec.blank())}>
                  Add {sec.one}
                </button>
              </div>
              <div className="max-h-[560px] overflow-auto">
                <table className="w-full min-w-[1180px] border-collapse">
                  <thead className="sticky top-0 z-[1]">
                    <tr>
                      <th className={`${TH} text-left`}>Item</th>
                      <th className={`${TH} text-left`}>Supplier</th>
                      <th className={`${TH} text-left`}>Spec</th>
                      <th className={`${TH} text-right`}>Cost ex GST</th>
                      <th className={`${TH} text-right`}>Trade price</th>
                      <th className={`${TH} text-right`}>Item price</th>
                      <th className={`${TH} text-right`}>Installation</th>
                      <th className={`${TH} text-right`}>Installed inc GST</th>
                      <th className={`${TH} text-right`}>STCs</th>
                      <th className={`${TH} text-right`}>Net installed</th>
                      <th className={`${TH} text-left`} />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const stcs = stcsFor(sec.key, r);
                      const inst = installFor(sec.key, r);
                      const item = itemPrice(r.supply, s);
                      const installed = item + inst.value;
                      const net = installed - (stcs ?? 0) * s.stcPrice;
                      const name = (r as Panel & Extra)[nameKey as "model"] ?? "";
                      return (
                        <tr key={r.id}>
                          <td className={TD}>
                            <input
                              aria-label="Name"
                              className={NAME}
                              value={name}
                              title={r.sku ? `SKU ${r.sku}${r.src ? ` · ${r.src}` : ""}` : r.src}
                              onChange={(e) => editRow(sec.key, r.id, nameKey, e.target.value)}
                            />
                          </td>
                          <td className={TD}>
                            <input
                              aria-label="Supplier"
                              className={SUPPLIER}
                              value={r.sup ?? ""}
                              onChange={(e) => editRow(sec.key, r.id, "sup", e.target.value)}
                            />
                          </td>
                          <td className={`${TD} ${SUB}`}>{sec.spec(r)}</td>
                          <td className={`${TD} ${NUM}`}>
                            <input
                              type="number"
                              step="any"
                              aria-label="Cost ex GST"
                              className={CELL}
                              value={r.supply}
                              onChange={(e) => editRow(sec.key, r.id, "supply", num(e.target.value))}
                            />
                          </td>
                          <td className={`${TD} ${NUM}`}>{money(tradePrice(r.supply, s))}</td>
                          <td className={`${TD} ${NUM}`}>{money(item)}</td>
                          <td className={`${TD} ${NUM}`}>
                            {sec.key === "extras" ? (
                              <input
                                type="number"
                                step="any"
                                aria-label="Installation inc GST"
                                className={CELL}
                                value={(r as Extra).install}
                                onChange={(e) => editRow(sec.key, r.id, "install", num(e.target.value))}
                              />
                            ) : (
                              (inst.label ?? rate(inst.value))
                            )}
                          </td>
                          <td className={`${TD} ${NUM}`}>{money(installed)}</td>
                          <td className={`${TD} ${NUM}`} style={{ background: stcs === null ? undefined : SUN_SOFT }}>
                            {stcs === null ? DASH : sec.key === "panels" ? stcs.toFixed(2) : String(stcs)}
                          </td>
                          <td className={`${TD} ${NUM}`}>{stcs === null ? DASH : money(net)}</td>
                          <td className={TD}>
                            {all.length > 1 ? (
                              <button
                                type="button"
                                className={`${BTN} ${BTN_SM} text-[#991B1B]`}
                                onClick={() => removeRow(sec.key, r.id)}
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
        <div className="grid items-start gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))" }}>
          <Card label="STC rules">
            <div className="flex flex-wrap items-baseline gap-2.5">
              <h2 className="m-0 flex-grow text-[16px] font-bold">STC rules in force</h2>
              <span className="rounded-full bg-[#DBEAFE] px-[9px] py-[3px] text-[11px] font-bold text-[#1E40AF]">
                Clean Energy Regulator
              </span>
            </div>
            <span className={SUB}>
              Solar STCs = &lfloor;array kW × zone rating × deeming years&rfloor;. Battery STCs = &lfloor;tiered usable kWh ×
              factor&rfloor;, locked on the installation date. Check the battery factor each January and July.
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
                    style={{ fontWeight: Number(year) === Number(date.slice(0, 4)) ? 700 : 400 }}
                  >
                    <span>Installed in {year}</span>
                    <span className="tabular-nums">{yrs} yrs</span>
                  </div>
                ))}
              </div>
            </div>

            <span className={EYE}>Battery STC factor by installation date</span>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
              {BATTERY_FACTORS.map(([from, to, value]) => {
                const current = date >= from && date <= to;
                return (
                  <div
                    key={from}
                    className="rounded-[10px] px-2.5 py-2 text-[12px]"
                    style={{ border: `1px solid ${current ? SUN : BORDER}`, background: current ? SUN_SOFT : "#FFFFFF" }}
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
              Usable kWh bands: first 14 kWh at 100%, 14&ndash;28 kWh at 60%, 28&ndash;50 kWh at 15%, nothing above 50 kWh.
              Batteries under 5 kWh usable get none. Battery-only jobs need existing solar on site. Inverter swaps and EV chargers
              earn no STCs.
            </span>
          </Card>

          <Card label="Publish">
            <h2 className="m-0 text-[16px] font-bold">Publish price book</h2>
            <span className={SUB}>
              Publishing saves this book to the pricing engine. The website&rsquo;s Designs page and every new quote price from it
              straight away; customers only ever see customer prices, never costs, margins or suppliers.
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-[10px] bg-[#F8FAFC] p-3">
                <span className={SUB}>Live now</span>
                <br />
                <strong>{priceBookLabel(live.source, live.updatedAt, live.loading)}</strong>
              </div>
              <div className="rounded-[10px] bg-[#F8FAFC] p-3">
                <span className={SUB}>This draft</span>
                <br />
                <strong>
                  {draftCount ? `${draftCount} change${draftCount === 1 ? "" : "s"} not published` : "No changes yet"}
                </strong>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`${BTN} border-0 font-bold`}
                style={{ background: SUNRISE, color: SUN_INK }}
                disabled={!canPublish || saving || draftCount === 0}
                onClick={publish}
              >
                {saving ? "Publishing…" : "Publish price book"}
              </button>
              <button type="button" className={BTN} disabled={live.loading || saving || draftCount === 0} onClick={discard}>
                Discard draft
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
