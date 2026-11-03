"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { aud, publicMarket, systemLine, type PublicSite } from "@/lib/ai-platform/market";

/** Website /ready-sites: what's for sale to installers (suburb, system and money only). */
export function PublicReadySites() {
  const [sites, setSites] = useState<PublicSite[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    publicMarket.sites().then(setSites).catch((e: Error) => setError(e.message));
  }, []);
  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-4 px-4 pb-16 md:px-6">
      {error && <p className="m-0 rounded-[12px] border border-[#FCA5A5] bg-[#FEF2F2] p-4 text-[14px] text-[#991B1B]">{error}</p>}
      {sites && !sites.length && <p className="m-0 rounded-[16px] border border-dashed border-[#CBD5E1] p-8 text-center text-[15px] text-[#475569]">No Ready Sites are open right now. New sites appear here and in the installer portal as soon as they&apos;re published.</p>}
      {!sites && !error && <p className="m-0 text-[15px] text-[#475569]">Loading Ready Sites…</p>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(sites ?? []).map((s) => (
          <article key={s.id} className="flex flex-col gap-3 rounded-[16px] border border-[#E3E8EF] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#0B4A7A]">{s.ref}</span>
              <span className="flex flex-wrap gap-1.5">
                {s.confirmed.payment && <span className="rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-[12px] font-semibold text-[#166534]">Deposit paid {aud(s.confirmed.depositPaid)}</span>}
                {s.confirmed.installation && <span className="rounded-full bg-[#E0F2FE] px-2.5 py-0.5 text-[12px] font-semibold text-[#075985]">Installation confirmed</span>}
              </span>
            </div>
            <h2 className="m-0 font-source-sans text-[20px] font-bold text-[#0F172A]">
              {s.suburb} {s.state} {s.postcode}
            </h2>
            <p className="m-0 text-[14px] text-[#334155]">{systemLine(s.system, s.kw)}</p>
            <p className="m-0 text-[13px] text-[#475569]">
              {[s.roof && `${s.roof} roof`, s.storeys, s.phases === 3 ? "Three-phase" : "Single-phase"].filter(Boolean).join(" · ")}
              {s.confirmed.windowFrom ? ` · install ${new Date(s.confirmed.windowFrom).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}–${s.confirmed.windowTo ? new Date(s.confirmed.windowTo).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : ""}` : ""}
            </p>
            <dl className="m-0 grid grid-cols-2 gap-2 border-t border-[#EEF2F6] pt-3 text-[13px]">
              <div>
                <dt className="text-[#475569]">Customer contract</dt>
                <dd className="m-0 font-source-sans text-[20px] font-bold text-[#0F172A]">{aud(s.contractValue)}</dd>
              </div>
              <div>
                <dt className="text-[#475569]">Site fee</dt>
                <dd className="m-0 font-source-sans text-[20px] font-bold text-[#0F172A]">{aud(s.siteFee)}</dd>
              </div>
            </dl>
            {s.documents.length > 0 && <p className="m-0 text-[12.5px] text-[#475569]">Comes with: {s.documents.join(", ")}</p>}
            <Link href="/installers/dashboard/ready-sites" className="mt-auto w-fit rounded-[10px] bg-[#0B4A7A] px-4 py-2 text-[14px] font-semibold text-white hover:bg-[#093d65]">
              Sign in to buy
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
