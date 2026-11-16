"use client";

import {
  formatOptionPrice,
  type DesignOptionCard,
} from "@/lib/customers/design-options";

/**
 * The four design options side by side (job journey, stage 1): equipment,
 * output, savings, STC estimate and the price after the STC discount, with a
 * "Choose" button per option. Figures the backend has not sent yet show as
 * "At quote" rather than a guess.
 */
type Props = {
  options: readonly DesignOptionCard[];
  selectedKey: string | null;
  locked: boolean;
  savingKey: string | null;
  onSelect: (key: string) => void;
};

const AT_QUOTE = "At quote";
const num = (v: number | null | undefined, unit: string, digits = 0) =>
  v != null && v > 0 ? `${new Intl.NumberFormat("en-AU", { maximumFractionDigits: digits }).format(v)} ${unit}` : null;
const money = (v: number | null | undefined) => (v != null && v > 0 ? formatOptionPrice(v) : null);

type Row = { label: string; hint?: string; value: (o: DesignOptionCard) => string | null; strong?: boolean };

const ROWS: Row[] = [
  { label: "System size", value: (o) => num(o.kw, "kW", 1) },
  { label: "Panels", value: (o) => (o.panelCount > 0 ? `${o.panelCount} × ${o.panelModel ?? "panel"}` : null) },
  { label: "Inverter", value: (o) => o.inverterModel ?? null },
  {
    label: "Battery",
    value: (o) => (o.batteryKwh && o.batteryKwh > 0 ? `${num(o.batteryKwh, "kWh", 1)}${o.batteryModel ? ` · ${o.batteryModel}` : ""}` : o.batteryKwh === 0 ? "No battery" : null),
  },
  { label: "Yearly output", value: (o) => num(o.annualOutputKwh, "kWh") },
  { label: "Estimated savings", value: (o) => (o.estimatedSavings > 0 ? `${formatOptionPrice(o.estimatedSavings)}/yr` : null) },
  { label: "Price before STCs", value: (o) => money(o.price) },
  { label: "STC discount", hint: "Federal small-scale certificates, applied at point of sale", value: (o) => (o.stcDiscount ? `−${formatOptionPrice(o.stcDiscount)}${o.stcCount ? ` (${o.stcCount} STCs)` : ""}` : null) },
  { label: "Your price", hint: "After STC discount, GST included", value: (o) => money(o.priceAfterStc ?? (o.price && o.stcDiscount ? o.price - o.stcDiscount : null)), strong: true },
  {
    label: "Payback",
    value: (o) => {
      const p = o.priceAfterStc ?? (o.price && o.stcDiscount ? o.price - o.stcDiscount : null);
      return p && o.estimatedSavings > 0 ? `${(p / o.estimatedSavings).toFixed(1)} years` : null;
    },
  },
];

export function DesignOptionsCompare({ options, selectedKey, locked, savingKey, onSelect }: Props) {
  if (!options.length) return null;
  return (
    <div className="px-4 pb-4">
      <div className="overflow-x-auto rounded-[12px] border customer-card-border">
        <table className="w-full min-w-[560px] border-collapse font-inter text-[12.5px] text-white/90">
          <caption className="sr-only">Your four design options compared</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 w-[150px] bg-customer-panel-bg px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] customer-text-muted">
                Compare
              </th>
              {options.map((o) => {
                const sel = o.key === selectedKey;
                return (
                  <th key={o.key} scope="col" className={`px-3 py-3 text-left align-bottom ${sel ? "bg-[rgba(245,158,11,0.16)]" : ""}`}>
                    <span className="block text-[13px] font-semibold text-white">{o.title}</span>
                    {sel ? <span className="mt-1 inline-block rounded-full bg-orange-amber px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-warm-black">Selected</span> : null}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.label} className="border-t border-white/10">
                <th scope="row" className="sticky left-0 z-10 bg-customer-panel-bg px-3 py-2.5 text-left align-top font-normal customer-text-muted">
                  {r.label}
                  {r.hint ? <span className="block text-[10.5px] leading-[14px] opacity-80">{r.hint}</span> : null}
                </th>
                {options.map((o) => {
                  const v = r.value(o);
                  return (
                    <td
                      key={o.key}
                      className={`px-3 py-2.5 align-top ${o.key === selectedKey ? "bg-[rgba(245,158,11,0.10)]" : ""} ${r.strong ? "text-[14px] font-bold text-white" : ""} ${v ? "" : "italic customer-text-muted"}`}
                    >
                      {v ?? AT_QUOTE}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t border-white/10">
              <td className="sticky left-0 z-10 bg-customer-panel-bg" />
              {options.map((o) => {
                const sel = o.key === selectedKey;
                return (
                  <td key={o.key} className={`px-3 py-3 ${sel ? "bg-[rgba(245,158,11,0.10)]" : ""}`}>
                    <button
                      type="button"
                      onClick={() => onSelect(o.key)}
                      disabled={locked || sel || savingKey != null}
                      className={`w-full whitespace-nowrap rounded-[8px] px-3 py-2 text-[12.5px] font-semibold transition ${
                        sel ? "cursor-default bg-white/10 text-white/70" : "bg-[linear-gradient(126deg,#2094F3_0%,#17CFCF_100%)] text-white hover:opacity-90 disabled:opacity-50"
                      }`}
                    >
                      {savingKey === o.key ? "Saving…" : sel ? "Your choice" : "Choose this design"}
                    </button>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 font-dm-sans text-[11px] customer-text-muted">
        Prices and STCs are estimates until your installer confirms them after the site photos. Choosing a design is free and you can change it until your agreement is signed.
      </p>
    </div>
  );
}
