"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { aud, DEAL_TYPES, publicMarket, systemLine, type PublicDeal } from "@/lib/ai-platform/market";

/** Website /ready-deals: installers' approved deals, filtered by postcode, system, building and price. */
export function ReadyDealsBrowser() {
  const [postcode, setPostcode] = useState("");
  const [type, setType] = useState("all");
  const [building, setBuilding] = useState("");
  const [maxPrice, setMaxPrice] = useState(40000);
  const [deals, setDeals] = useState<PublicDeal[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pc = /^\d{4}$/.test(postcode) ? postcode : "";
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      publicMarket
        .deals({ postcode: pc, type, building, maxPrice: maxPrice < 40000 ? maxPrice : undefined })
        .then((d) => live && (setDeals(d), setError(null)))
        .catch((e: Error) => live && setError(e.message));
    }, 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [pc, type, building, maxPrice]);

  const summary = useMemo(() => (deals ? `${deals.length} deal${deals.length === 1 ? "" : "s"}${pc ? ` for ${pc}` : ""}` : "Loading deals…"), [deals, pc]);

  return (
    <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-6 px-4 pb-16 md:px-6 lg:grid-cols-[280px_1fr]">
      <aside className="flex h-fit flex-col gap-4 rounded-[16px] border border-[#E3E8EF] bg-white p-5 lg:sticky lg:top-24">
        <h2 className="m-0 font-source-sans text-[18px] font-bold text-[#0F172A]">Find a deal</h2>
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-[#334155]">
          Your postcode
          <input value={postcode} onChange={(e) => setPostcode(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="e.g. 2153" className="rounded-[10px] border border-[#CBD5E1] px-3 py-2 text-[15px] font-normal focus:border-[#0B4A7A] focus:outline-none" />
          <span className="text-[12px] font-normal text-[#5B6B80]">Shows only installers who work in your area.</span>
        </label>
        <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
          <legend className="mb-1 text-[13px] font-semibold text-[#334155]">System</legend>
          <div className="flex flex-wrap gap-1.5">
            {[{ key: "all", label: "All" }, ...DEAL_TYPES].map((t) => (
              <button key={t.key} type="button" onClick={() => setType(t.key)} aria-pressed={type === t.key} className={`rounded-full border px-3 py-1 text-[13px] font-semibold ${type === t.key ? "border-[#0B4A7A] bg-[#0B4A7A] text-white" : "border-[#CBD5E1] bg-white text-[#0F172A] hover:border-[#94A3B8]"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-[#334155]">
          Building
          <select value={building} onChange={(e) => setBuilding(e.target.value)} className="rounded-[10px] border border-[#CBD5E1] bg-white px-3 py-2 text-[15px] font-normal">
            <option value="">Any</option>
            <option value="house">House</option>
            <option value="townhouse">Townhouse</option>
            <option value="unit">Unit</option>
            <option value="business">Business</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-[#334155]">
          Up to {maxPrice >= 40000 ? "any price" : aud(maxPrice)}
          <input type="range" min={2000} max={40000} step={500} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="accent-[#0B4A7A]" />
        </label>
        <p className="m-0 rounded-[10px] bg-[#F1F5F9] p-3 text-[12.5px] leading-relaxed text-[#334155]">
          Prices include installation and GST, after the STC rebate. You pay <b>50% when you buy</b> and <b>50% before installation</b>. Every deal is checked and approved by EasyLink.
        </p>
      </aside>

      <section className="flex min-w-0 flex-col gap-4" aria-live="polite">
        <p className="m-0 text-[14px] font-semibold text-[#475569]">{summary}</p>
        {error && <p className="m-0 rounded-[12px] border border-[#FCA5A5] bg-[#FEF2F2] p-4 text-[14px] text-[#991B1B]">{error}</p>}
        {deals && !deals.length && !error && (
          <div className="rounded-[16px] border border-dashed border-[#CBD5E1] p-8 text-center text-[15px] text-[#475569]">
            No deals match{pc ? ` in ${pc}` : ""} right now. Try another system type, or{" "}
            <Link href="/designs" className="font-semibold text-[#0B4A7A] underline">
              design your own system
            </Link>
            .
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {(deals ?? []).map((d) => (
            <DealCard key={d.id} d={d} />
          ))}
        </div>
      </section>
    </div>
  );
}

function DealCard({ d }: { d: PublicDeal }) {
  const save = d.wasPrice ? d.wasPrice - d.price : 0;
  return (
    <article className="flex flex-col gap-3 rounded-[16px] border border-[#E3E8EF] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center gap-2">
        {d.badge && <span className="rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-[12px] font-bold text-[#92400E]">{d.badge}</span>}
        <span className="rounded-full bg-[#EEF7FE] px-2.5 py-0.5 text-[12px] font-semibold text-[#0B4A7A]">{DEAL_TYPES.find((t) => t.key === d.type)?.label}</span>
        {d.remaining <= 3 && <span className="text-[12px] font-semibold text-[#B45309]">Only {d.remaining} left</span>}
      </div>
      <h3 className="m-0 font-source-sans text-[20px] font-bold leading-snug text-[#0F172A]">{d.title}</h3>
      <p className="m-0 text-[14px] text-[#334155]">{systemLine(d.system, d.kw)}</p>
      {d.description && <p className="m-0 line-clamp-3 text-[13.5px] leading-relaxed text-[#475569]">{d.description}</p>}
      <p className="m-0 text-[13px] text-[#475569]">
        Installed by <b className="text-[#0F172A]">{d.installerName}</b>
        {d.stcs ? ` · includes ${d.stcs} STCs (${aud(d.stcValue)})` : ""}
      </p>
      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-[#EEF2F6] pt-3">
        <div className="flex flex-col">
          {d.wasPrice && <span className="text-[13px] text-[#64748B] line-through">{aud(d.wasPrice)}</span>}
          <span className="font-source-sans text-[28px] font-bold leading-none text-[#0F172A]">{aud(d.price)}</span>
          <span className="text-[12px] text-[#475569]">
            {aud(d.deposit)} today{save > 0 ? ` · save ${aud(save)}` : ""}
          </span>
        </div>
        <Link href={`/ready-deals/${encodeURIComponent(d.id)}`} className="rounded-[10px] bg-[#0B4A7A] px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-[#093d65]">
          Buy now
        </Link>
      </div>
    </article>
  );
}
