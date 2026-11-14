import Image from "next/image";

import type { AboutUsPortfolioItem } from "@/utils/constant";

/**
 * One real EasyLink job for the About Us "Site Portfolio": the roof from NSW
 * aerial imagery with the OpenSolar panel layout drawn on it, the client's
 * first name and suburb only (never the street), the system, and the savings
 * from the customer's proposal. Same spinning gold ring shell as the old
 * blog-style cards so the section keeps its look.
 */
const GOLD_RING_GRADIENT =
  "conic-gradient(from var(--rainbow-angle), #FFEF62, #F78D00, #FFEF62)";

const money = (n: number) => `$${n.toLocaleString("en-AU")}`;
const kw = (n: number) => `${Number(n.toFixed(2))} kW`;
/** "4 years 9 months" -> "4 yrs 9 mo", so it fits on one line in the stats strip. */
const shortPayback = (s: string) =>
  s.replace(/years?/, (m) => (m === "year" ? "yr" : "yrs")).replace(/months?/, "mo");
const kwh = (n: number) => `${Number(n.toFixed(1))} kWh`;

const STATUS_STYLE: Record<AboutUsPortfolioItem["status"], string> = {
  Installed: "bg-emerald-500/90 text-white",
  Installing: "bg-amber-400 text-[#1b1b1b]",
  Designed: "bg-sky-500/90 text-white",
};

export function SitePortfolioCard({ item }: { item: AboutUsPortfolioItem }) {
  const name = item.client ? `${item.client}, ${item.suburb}` : `${item.suburb} home`;
  const battery = item.batteryKwh > 0 ? `a ${kwh(item.batteryKwh)}${item.batteryBrand ? ` ${item.batteryBrand}` : ""} battery` : null;

  return (
    <article className="mx-auto h-full w-full max-w-[407px] p-[7px]">
      <div
        className="relative h-full w-full overflow-hidden rounded-[16.759px] p-[7px] motion-reduce:animate-none [animation:rainbow-angle-spin_5s_linear_infinite]"
        style={{ backgroundImage: GOLD_RING_GRADIENT }}
      >
        <div className="flex h-full flex-col overflow-hidden rounded-[11px] bg-white">
          <div className="relative aspect-square w-full bg-[#0b2a5b]">
            <Image
              src={item.imageSrc}
              alt={`Aerial view of the ${kw(item.systemKw)} EasyLink solar layout on a home in ${item.suburb}`}
              fill
              sizes="(min-width: 1280px) 393px, (min-width: 768px) 45vw, 92vw"
              className="object-cover"
            />
            <span
              className={`absolute left-3 top-3 rounded-full px-3 py-1 font-source-sans text-sm font-semibold shadow ${STATUS_STYLE[item.status]}`}
            >
              {item.status}
            </span>
            <span className="absolute right-3 top-3 rounded-lg bg-[#06142e]/85 px-3 py-1 font-source-sans text-sm font-semibold text-white">
              {kw(item.systemKw)}
            </span>
          </div>

          <div className="flex flex-1 flex-col gap-4 px-6 pb-6 pt-5">
            <div>
              <h3 className="font-source-sans text-[24px] font-bold leading-tight tracking-[-0.4px] text-[#111827]">
                {name}
              </h3>
              <p className="mt-1.5 font-source-sans text-[15px] leading-snug text-[#4b5563]">
                {kw(item.systemKw)} solar ({item.panels}){battery ? ` with ${battery}` : ""}, producing about{" "}
                {Math.round(item.annualKwh / 100) * 100 >= 1000
                  ? (Math.round(item.annualKwh / 100) * 100).toLocaleString("en-AU")
                  : item.annualKwh}{" "}
                kWh a year.
              </p>
            </div>

            <dl className="mt-auto grid grid-cols-3 gap-2 rounded-xl bg-[#fff7e0] p-3 text-center">
              <div>
                <dt className="font-source-sans text-[11px] font-semibold uppercase tracking-wide text-[#8a6d1a]">
                  Year 1 savings
                </dt>
                <dd className="mt-0.5 font-source-sans text-[17px] font-bold text-[#111827]">
                  {money(item.annualSavings)}
                </dd>
              </div>
              <div>
                <dt className="font-source-sans text-[11px] font-semibold uppercase tracking-wide text-[#8a6d1a]">
                  Payback
                </dt>
                <dd className="mt-0.5 whitespace-nowrap font-source-sans text-[17px] font-bold text-[#111827]">
                  {item.payback ? shortPayback(item.payback) : "—"}
                </dd>
              </div>
              <div>
                <dt className="font-source-sans text-[11px] font-semibold uppercase tracking-wide text-[#8a6d1a]">
                  Lifetime
                </dt>
                <dd className="mt-0.5 font-source-sans text-[17px] font-bold text-[#111827]">
                  {money(item.lifetimeSavings)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </article>
  );
}
