"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAllActiveProductRows, type PublicProductRow } from "@/lib/public/products";
import { productImage } from "@/lib/designs/product-specs";

/**
 * Matches the Easylink Designer "Pricing & stock" mock (DistPricing.dc.html) —
 * the one catalogue the whole portal shares, with the margin that sets what
 * linked installers pay.
 *
 * Rows are the live EasyLink catalogue (every active product). The margin
 * slider is real client state and the "Installer trade" column recomputes
 * from it. RRP is the catalogue sell price (marked "est." while it is an
 * estimate); "Your price" needs the supplier price list, so it shows a
 * placeholder until that is loaded. Stock isn't connected to the distributors
 * yet, so the stock columns show a dash rather than invented numbers.
 */

/** Stock not connected yet. */
const GREY = "#5B6B80";

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
  category: string;
  thumbUrl?: string;
  rrpEstimate?: boolean;
};

const CATEGORY_TABS = [
  ["All", null],
  ["Panels", "Solar Panel"],
  ["Inverters", "Inverter"],
  ["Batteries", "Battery"],
  ["EV chargers", "EV Charger"],
  ["Heat pumps", "Heat Pump"],
  ["Portable power", "Portable Power"],
] as const;

function toRow(p: PublicProductRow): Row {
  const specs = (p.specs ?? {}) as Record<string, unknown>;
  const cec =
    specs.cecApproved === true ? "Approved" : specs.cecApproved === false ? "Not listed" : "n/a";
  return {
    name: [p.brand?.trim(), p.name].filter(Boolean).join(" "),
    sku: p.sku || p.id.slice(0, 8),
    cec,
    rrp: p.retailPrice ?? p.basePrice ?? null,
    price: p.wholesalePrice ?? null,
    sydney: DASH,
    sydneyTone: GREY,
    brisbane: DASH,
    brisbaneTone: GREY,
    incoming: DASH,
    category: p.category,
    thumbUrl: productImage(p)?.thumbUrl,
    rrpEstimate: specs.priceEstimate === true,
  };
}

/** Catalogue prices always carry cents. */
function money(n: number): string {
  return `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function MasterDistPricing() {
  const [margin, setMargin] = useState(8);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof CATEGORY_TABS)[number][0]>("All");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchAllActiveProductRows()
      .then((r) => {
        if (!cancelled) setRows(r.map(toRow));
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Could not load the catalogue");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    const backend = CATEGORY_TABS.find(([label]) => label === tab)?.[1] ?? null;
    const q = query.trim().toLowerCase();
    return (rows ?? [])
      .filter((r) => !backend || r.category === backend)
      .filter((r) => !q || `${r.name} ${r.sku}`.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, tab, query]);

  return (
    <div className="flex min-h-full flex-col text-[#0F172A]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          Supply &amp; ordering <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Pricing &amp; Stock</span>
        </nav>
        <span className="rounded-full bg-[#DBEAFE] px-2.5 py-[3px] text-[12px] font-bold text-[#1E40AF]">
          {rows ? `${rows.length} products` : "Loading…"}
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
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORY_TABS.map(([label]) => {
              const on = tab === label;
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setTab(label)}
                  className="h-8 rounded-full px-3 text-[12px] font-semibold"
                  style={{
                    border: `1px solid ${on ? "#0B1A2E" : "#CBD5E1"}`,
                    background: on ? "#0B1A2E" : "#FFFFFF",
                    color: on ? "#FFFFFF" : "#334155",
                  }}
                >
                  {label}
                </button>
              );
            })}
            <input
              type="search"
              aria-label="Search the catalogue"
              placeholder="Search product or SKU…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="ml-auto h-8 w-[240px] max-w-full rounded-[9px] border border-[#CBD5E1] px-2.5 text-[13px] outline-none"
            />
          </div>
          {loadError ? <p className="m-0 text-[13px] text-[#991B1B]">{loadError}</p> : null}
          {!rows && !loadError ? <p className="m-0 text-[13px] text-[#5B6B80]">Loading the catalogue…</p> : null}
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
                {visible.map((r) => (
                  <tr key={`${r.category}-${r.sku}-${r.name}`}>
                    <td className={`${TD} font-semibold`}>
                      <span className="flex items-center gap-2">
                        {r.thumbUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- compressed library thumbnail
                          <img src={r.thumbUrl} alt="" loading="lazy" className="size-8 shrink-0 rounded bg-white object-contain" />
                        ) : (
                          <span className="size-8 shrink-0 rounded bg-[#EEF2F6]" aria-hidden />
                        )}
                        {r.name}
                      </span>
                    </td>
                    <td className={TD}>
                      <code>{r.sku}</code>
                    </td>
                    <td className={TD}>{r.cec}</td>
                    <td className={`${TD} ${NUM}`}>
                      {r.rrp ? money(r.rrp) : "$[RRP]"}
                      {r.rrp && r.rrpEstimate ? <span className="ml-1 text-[11px] text-[#5B6B80]">est.</span> : null}
                    </td>
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
            Prices ex GST. &ldquo;est.&rdquo; marks catalogue estimates; placeholders show where the
            supplier price list hasn&rsquo;t been loaded yet. Stock isn&rsquo;t connected to the
            distributors yet.
          </span>
        </section>
      </div>
    </div>
  );
}
