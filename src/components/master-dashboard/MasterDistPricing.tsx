"use client";

import { useState } from "react";

/**
 * Matches the Easylink Designer "Pricing & stock" mock (DistPricing.dc.html) —
 * the one catalogue the whole portal shares, with the margin that sets what
 * linked installers pay.
 *
 * Sample data: this app has no catalogue feed. The margin slider is real
 * client state and the "Installer trade" column recomputes from it, because
 * seeing the trade price move is the entire point of the control.
 *
 * Rows with no price carry placeholders ($[RRP] / $[price] / price + N%)
 * rather than invented numbers — the mock's own way of showing which lines the
 * price list hasn't reached yet.
 */

/** Stock-level colours: comfortable, getting low, out. */
const GREEN = "#166534";
const AMBER = "#92400E";
const RED = "#991B1B";

const TH = "border-b border-[#E3E8EF] p-2 text-left text-[13px] font-semibold text-[#475569]";
const TD = "border-b border-[#EEF2F6] px-2 py-2.5 text-[13px]";
const NUM = "text-right tabular-nums";
/** Shown where there is no incoming shipment. */
const DASH = "—";

type Row = {
  name: string;
  sku: string;
  cec: string;
  /** null where the price list hasn't been loaded for this line. */
  rrp: number | null;
  price: number | null;
  sydney: string;
  sydneyTone: string;
  brisbane: string;
  brisbaneTone: string;
  incoming: string;
};

const ROWS: Row[] = [
  { name: "AXITEC AC-440TGB/108BBA 440 W", sku: "PNL-AX440", cec: "Approved", rrp: null, price: null, sydney: "1,240", sydneyTone: GREEN, brisbane: "860", brisbaneTone: GREEN, incoming: DASH },
  { name: "FOXESS 1K5-1P-HI-9.9 hybrid", sku: "INV-FX99", cec: "Approved", rrp: null, price: null, sydney: "34", sydneyTone: GREEN, brisbane: "0", brisbaneTone: RED, incoming: "40 · 24 Oct" },
  { name: "5 kW single-phase inverter", sku: "INV-S5", cec: "Approved", rrp: 1690, price: 1286.36, sydney: "58", sydneyTone: GREEN, brisbane: "31", brisbaneTone: GREEN, incoming: DASH },
  { name: "FOX ESS 1K5-BAT-4660-L7", sku: "BAT-FX4660", cec: "Approved", rrp: null, price: null, sydney: "6", sydneyTone: AMBER, brisbane: "11", brisbaneTone: GREEN, incoming: "60 · 24 Oct" },
  { name: "10 kWh stackable battery", sku: "BAT-100S", cec: "Approved", rrp: 7200, price: 6120, sydney: "0", sydneyTone: RED, brisbane: "0", brisbaneTone: RED, incoming: "120 · 24 Oct" },
  { name: "myenergi zappi v2 7 kW", sku: "EVC-ZAP7", cec: "n/a", rrp: null, price: null, sydney: "0", sydneyTone: RED, brisbane: "19", brisbaneTone: GREEN, incoming: "30 · 28 Oct" },
  { name: "Reclaim Energy Gen3 270 L", sku: "HWP-RC270", cec: "n/a", rrp: null, price: null, sydney: "12", sydneyTone: GREEN, brisbane: "4", brisbaneTone: AMBER, incoming: DASH },
  { name: "Tile roof racking kit", sku: "RCK-T24", cec: "n/a", rrp: 1390, price: 1190.99, sydney: "41", sydneyTone: GREEN, brisbane: "26", brisbaneTone: GREEN, incoming: DASH },
  { name: "DC isolator and cabling pack", sku: "BOS-DC2", cec: "n/a", rrp: null, price: null, sydney: "88", sydneyTone: GREEN, brisbane: "40", brisbaneTone: GREEN, incoming: DASH },
  { name: "BLUETTI AC180", sku: "BLU-AC180", cec: "n/a", rrp: 999, price: 790.91, sydney: "52", sydneyTone: GREEN, brisbane: "18", brisbaneTone: GREEN, incoming: DASH },
  { name: "BLUETTI EP760 + B500", sku: "BLU-EP760", cec: "n/a", rrp: 6499, price: 5450, sydney: "8", sydneyTone: AMBER, brisbane: "3", brisbaneTone: AMBER, incoming: "20 · 2 Nov" },
];

/** Catalogue prices always carry cents. */
function money(n: number): string {
  return `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function MasterDistPricing() {
  const [margin, setMargin] = useState(8);

  return (
    <div className="flex min-h-full flex-col text-[#0F172A]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          Supply &amp; ordering <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Pricing &amp; Stock</span>
        </nav>
        <span className="rounded-full bg-[#DBEAFE] px-2.5 py-[3px] text-[12px] font-bold text-[#1E40AF]">
          Sample data
        </span>
      </header>

      <div className="flex w-full max-w-[1400px] flex-col gap-[18px] px-8 pb-14 pt-6">
        <div>
          <h1 className="m-0 font-source-sans text-[28px] font-bold">Pricing &amp; stock</h1>
          <p className="mb-0 mt-1 text-[13px] text-[#5B6B80]">
            One catalogue for the whole portal · the same SKUs appear in installers&rsquo; Equipment
            and on every job&rsquo;s kit
          </p>
        </div>

        <section
          aria-label="Installer price tier"
          className="flex flex-wrap items-center gap-4 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <span className="flex flex-[1_1_280px] flex-col gap-0.5">
            <strong className="text-[15px]">Installer trade price</strong>
            <span className="text-[13px] text-[#475569]">
              What your linked installers see in Equipment and pay when they order for their own
              customers. Kit for your jobs is billed to you at your price.
            </span>
          </span>
          <label htmlFor="margin" className="text-[13px] font-semibold">
            Your margin · {margin}%
          </label>
          <input
            id="margin"
            type="range"
            min={0}
            max={20}
            step={1}
            value={margin}
            onChange={(e) => setMargin(Number(e.target.value))}
            className="h-11 w-[220px] accent-[#F68A0A]"
          />
        </section>

        <section
          aria-label="Catalogue"
          className="flex flex-col gap-2.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1060px] border-collapse">
              <thead>
                <tr>
                  <th className={TH}>Product</th>
                  <th className={TH}>SKU</th>
                  <th className={TH}>CEC</th>
                  <th className={`${TH} text-right`}>RRP</th>
                  <th className={`${TH} text-right`}>Your price</th>
                  <th className={`${TH} text-right`}>Installer trade</th>
                  <th className={`${TH} text-right`}>Sydney</th>
                  <th className={`${TH} text-right`}>Brisbane</th>
                  <th className={TH}>Incoming</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.sku}>
                    <td className={`${TD} font-semibold`}>{r.name}</td>
                    <td className={TD}>
                      <code>{r.sku}</code>
                    </td>
                    <td className={TD}>{r.cec}</td>
                    <td className={`${TD} ${NUM}`}>{r.rrp ? money(r.rrp) : "$[RRP]"}</td>
                    <td className={`${TD} ${NUM}`}>{r.price ? money(r.price) : "$[price]"}</td>
                    <td className={`${TD} ${NUM} font-bold`}>
                      {r.price ? money(r.price * (1 + margin / 100)) : `price + ${margin}%`}
                    </td>
                    <td
                      className={`${TD} ${NUM} font-semibold`}
                      style={{ color: r.sydneyTone }}
                    >
                      {r.sydney}
                    </td>
                    <td
                      className={`${TD} ${NUM} font-semibold`}
                      style={{ color: r.brisbaneTone }}
                    >
                      {r.brisbane}
                    </td>
                    <td className={TD}>{r.incoming}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <span className="text-[12px] text-[#475569]">
            Prices ex GST. Placeholders show where the price list hasn&rsquo;t been loaded yet.
          </span>
        </section>
      </div>
    </div>
  );
}
