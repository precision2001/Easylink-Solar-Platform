"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { aud, market, type PublicSite } from "@/lib/ai-platform/market";

/** Installer home: Ready Sites for sale in this installer's service areas (hidden when there are none). */
export function ReadySitesBanner() {
  const [sites, setSites] = useState<PublicSite[] | null>(null);
  useEffect(() => {
    market
      .sites<{ forSale: PublicSite[] }>("installer")
      .then((d) => setSites(d.forSale))
      .catch(() => setSites([]));
  }, []);
  if (!sites?.length) return null;
  const mine = sites.filter((s) => s.inArea);
  const list = (mine.length ? mine : sites).slice(0, 3);
  const contracts = (mine.length ? mine : sites).reduce((t, s) => t + s.contractValue, 0);
  const deposits = (mine.length ? mine : sites).reduce((t, s) => t + (s.confirmed.payment ? s.confirmed.depositPaid : 0), 0);
  const n = mine.length || sites.length;
  return (
    <div className="rounded-[16px] bg-gradient-to-br from-[#FFE866] to-[#F68A0A] p-0.5">
      <div className="flex flex-wrap items-center gap-3.5 rounded-[14px] bg-[#0B1A2E] px-[18px] py-3.5 text-white">
        <span className="rounded-full bg-[#F68A0A] px-2.5 py-[3px] text-[11px] font-extrabold text-[#3B1D00]">READY SITES</span>
        <span className="flex flex-[1_1_320px] flex-col">
          <strong className="text-[16px]">
            {n} confirmed customer{n === 1 ? "" : "s"} {mine.length ? "in your service areas" : "for sale"}
          </strong>
          <span className="text-[13px] text-[#E6EDF7]">
            {list.map((s) => `${s.suburb} ${s.kw ? `${s.kw} kW` : ""}${s.system.battery ? ` + ${s.system.battery.usableKwh} kWh` : ""}`).join(" · ")} · {aud(contracts)} in contracts
            {deposits ? `, ${aud(deposits)} in deposits already paid` : ""}
          </span>
        </span>
        <Link href="/installers/dashboard/ready-sites" className="flex h-10 items-center rounded-[10px] bg-[#F68A0A] px-4 text-[14px] font-bold text-[#3B1D00] no-underline">
          View Ready Sites
        </Link>
      </div>
    </div>
  );
}
