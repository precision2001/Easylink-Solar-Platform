"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { aud, publicMarket, systemLine, type PublicDeal } from "@/lib/ai-platform/market";
import RangeSlider from "react-range-slider-input";
import "react-range-slider-input/dist/style.css";

const batteryDeals = [
  {
    badge: "Fast Charging",
    bestValue: true,
    title: "Battery Deal - FOXESS 40kW Battery",
    description:
      "40kW Battery modules with 10kW FOXESS Hybrid inverter (if required), including installation and commissioning to the existing and compatible solar system.",
    price: "6,991",
  },
  {
    badge: "Fast Charging",
    bestValue: false,
    title: "Battery Deal - FoxESS 30kW Battery",
    description:
      "30kW Battery Modules with 10kW FoxESS Hybrid inverter (if required) including installation and commissioning to the existing and compatible solar system.",
    price: "5,991",
  },
];

const morePackages = [
  {
    kw: "10.1kW",
    title: "10kW Solar System + 9.2kW Battery",
    description:
      "TRINA VerteX S+ N-Type Dual Glass 440 watt panels. FOXESS EQ4880 - 9.2kW Battery. FOXESS 9.9kW Hybrid…",
    price: "6,401",
  },
  {
    kw: "10.1kW",
    title: "10kW Solar System + 14.64kW Battery",
    description: "FOXESS EQ4880 - 9.2kW Battery. FOXESS 9.9kW Hybrid Inverter.",
    price: "6,490",
  },
  {
    kw: "20kW",
    title: "SIGENERGY 20kW Solar System + 18kW Sigen Battery",
    description:
      "Single Phase Homes - Sigen Gateway Power Controller (12kW) - Sigen Battery Module - EV DC 12kW HV Fast…",
    price: "11,110",
  },
];

function GreenCheck() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="text-success-bright"
    >
      <path
        d="M13.3 4.7L6.5 11.5L2.7 7.7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-ink"
    >
      <path
        d="M22 3H2L10 12.46V19L14 21V12.46L22 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-muted"
    >
      <path
        d="M4 6.5L8 10L12 6.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type FilterSelectProps = {
  label: string;
  value: string;
};

function FilterSelect({ label, value }: FilterSelectProps) {
  return (
    <div className="w-full min-w-[260px]">
      <label className="block font-source-sans text-[14px] font-medium tracking-[-0.15px] text-muted">
        {label}
      </label>
      <div className="relative mt-2">
        <select
          className="h-10 w-full appearance-none rounded-[10px] border border-transparent bg-faint px-4 pr-10 font-source-sans text-[15px] font-medium tracking-[-0.23px] text-slate-muted outline-none"
          defaultValue={value}
          aria-label={label}
        >
          <option value={value}>{value}</option>
        </select>
        <ChevronDownIcon />
      </div>
    </div>
  );
}

type VisualRangeProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
};

function formatRangeValue(
  value: number,
  options: { prefix?: string; suffix?: string },
) {
  const formatted = value.toLocaleString("en-AU");
  return `${options.prefix ?? ""}${formatted}${options.suffix ?? ""}`;
}

function VisualRange({
  label,
  min,
  max,
  step,
  prefix,
  suffix,
}: VisualRangeProps) {
  const [rangeValue, setRangeValue] = useState<[number, number]>([min, max]);

  return (
    <div className="w-full min-w-[260px]">
      <p className="font-source-sans text-[14px] font-medium tracking-[-0.15px] text-muted">
        {label}
      </p>
      <div className="mt-2">
        <RangeSlider
          className="filter-range-slider"
          min={min}
          max={max}
          step={step}
          value={rangeValue}
          onInput={(value) => setRangeValue(value as [number, number])}
          ariaLabel={[`${label} minimum`, `${label} maximum`]}
        />
        <div className="mt-2 flex items-center justify-between font-source-sans text-xs font-medium text-slate-muted">
          <span>{formatRangeValue(rangeValue[0], { prefix, suffix })}</span>
          <span>{formatRangeValue(rangeValue[1], { prefix, suffix })}</span>
        </div>
      </div>
    </div>
  );
}

type Card = { href: string; badge: string; bestValue?: boolean; kw: string; title: string; description: string; price: string };
const toCard = (d: PublicDeal): Card => ({
  href: `/ready-deals/${encodeURIComponent(d.id)}`,
  badge: d.badge ?? (d.system.battery ? `${d.system.battery.usableKwh} kWh` : "Ready Deal"),
  bestValue: !!d.wasPrice,
  kw: d.kw ? `${d.kw}kW` : d.system.battery ? `${d.system.battery.usableKwh} kWh` : "Deal",
  title: d.title,
  description: `${systemLine(d.system, d.kw)}. Installed by ${d.installerName}.`,
  price: aud(d.price).slice(1),
});

/** Live, EasyLink-approved Ready Deals when there are any; the sample packages otherwise. */
function useHomeDeals() {
  const [live, setLive] = useState<PublicDeal[] | null>(null);
  useEffect(() => {
    publicMarket.deals().then(setLive).catch(() => setLive([]));
  }, []);
  if (!live?.length) {
    return {
      featured: { href: "/ready-deals", badge: "", kw: "10.1kW", title: "10kW Solar System + 20kW Battery", description: "TRINA VeRTEX S+ N-Type Dual Glass 440 watt panels. FOXESS EQ4880 - 14.64kW Battery. FOXESS 9.9kW Hybrid Inverter.", price: "6,565" } as Card,
      battery: batteryDeals.map((d) => ({ ...d, href: "/ready-deals", kw: "" })) as Card[],
      more: morePackages.map((d) => ({ ...d, href: "/ready-deals", badge: "" })) as Card[],
    };
  }
  const cards = live.map(toCard);
  const batteryIdx = live.map((d, i) => (d.type === "battery" ? i : -1)).filter((i) => i >= 0);
  const rest = cards.filter((_, i) => i !== 0 && !batteryIdx.includes(i));
  return { featured: cards[0]!, battery: batteryIdx.slice(0, 2).map((i) => cards[i]!), more: rest.slice(0, 6) };
}

export function SpecialDealsSection() {
  const { featured, battery, more } = useHomeDeals();
  return (
    <section className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-[1216px]">
        {/* Heading */}
        <div className="text-center">
          <h2 className="font-source-sans text-3xl font-bold tracking-[-0.9px] text-ink sm:text-4xl">
            Special Ready Deals
          </h2>
          <p className="mt-4 font-source-sans text-base text-muted">
            If you already know all of this, choose one of our professional
            pre-made solar packages
          </p>
        </div>

        {/* Filter Bar */}
        <div className="mt-8 rounded-2xl bg-white px-8 py-8 shadow-[0_8px_32px_-8px_rgba(17,28,39,0.12)]">
          <div className="flex items-center gap-[10px]">
            <FilterIcon />
            <span className="font-source-sans text-[18px] font-semibold tracking-[-0.89px] text-ink">
              Filter packages
            </span>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
            <FilterSelect label="Building Type" value="Solar Panels" />
            <FilterSelect label="System Type" value="Solar Panel A" />
            <VisualRange
              label="Price Range"
              min={0}
              max={100000}
              step={1000}
              prefix="$"
            />
            <VisualRange
              label="System Size (kW)"
              min={0}
              max={100}
              step={1}
              suffix="kW"
            />
          </div>
        </div>

        {/* Featured Deal */}
        <div className="mx-auto mt-10 max-w-[672px] rounded-2xl bg-white p-6 shadow-[0_8px_32px_-8px_rgba(17,28,39,0.12)]">
          <span className="inline-block rounded-full border border-primary bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {featured.kw}
          </span>
          <h3 className="mt-3 font-source-sans text-xl font-bold tracking-[-0.5px] text-ink sm:text-2xl">
            {featured.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {featured.description}
          </p>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-sm text-ink">A$</span>
            <span className="font-source-sans text-3xl font-bold text-ink">
              {featured.price}
            </span>
            <span className="text-sm text-muted">/incl. installation</span>
          </div>
          <Link
            href={featured.href}
            className="mt-4 block w-full rounded-xl py-2.5 text-center text-base font-semibold text-white"
            style={{
              backgroundImage:
                "linear-gradient(132deg, var(--color-brand-blue) 0%, var(--color-brand-teal) 100%)",
            }}
          >
            Buy Now
          </Link>
        </div>

        {/* Battery Deals */}
        {battery.length > 0 && <h3 className="mt-12 text-center font-source-sans text-2xl font-bold text-ink">
          Battery Deals
        </h3>}
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          {battery.map((deal) => (
            <div
              key={deal.title}
              className="relative rounded-2xl bg-white p-6 shadow-[0_8px_32px_-8px_rgba(17,28,39,0.12)]"
            >
              {deal.bestValue && (
                <span className="absolute -top-3 left-4 rounded-full border border-gold bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
                  Best Value
                </span>
              )}
              <span className="inline-block rounded-full border border-primary bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {deal.badge}
              </span>
              <h4 className="mt-3 font-source-sans text-xl font-bold tracking-[-0.5px] text-ink">
                {deal.title}
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {deal.description}
              </p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-sm text-ink">A$</span>
                <span className="font-source-sans text-3xl font-bold text-ink">
                  {deal.price}
                </span>
                <span className="text-sm text-muted">/incl. installation</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-success-bright">
                <GreenCheck />
                <span>Installation Included</span>
              </div>
              <Link
                href={deal.href}
                className="mt-4 block w-full rounded-xl py-2.5 text-center text-base font-semibold text-white"
                style={{
                  backgroundImage:
                    "linear-gradient(132deg, var(--color-brand-blue) 0%, var(--color-brand-teal) 100%)",
                }}
              >
                Buy Now
              </Link>
            </div>
          ))}
        </div>

        {/* More Packages */}
        <h3 className="mt-12 font-source-sans text-2xl font-bold text-ink">
          More Packages
        </h3>
        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {more.map((pkg) => (
            <div
              key={pkg.title}
              className="flex flex-col justify-between rounded-2xl bg-white p-6 shadow-[0_8px_32px_-8px_rgba(17,28,39,0.12)]"
            >
              <div>
                <span className="inline-block rounded-full border border-primary bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {pkg.kw}
                </span>
                <h4 className="mt-3 font-source-sans text-lg font-bold text-ink">
                  {pkg.title}
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {pkg.description}
                </p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-xs text-ink">A$</span>
                  <span className="font-source-sans text-2xl font-bold text-ink">
                    {pkg.price}
                  </span>
                  <span className="text-xs text-muted">
                    /incl. installation
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-success-bright">
                  <GreenCheck />
                  <span>incl. installation</span>
                </div>
              </div>
              <Link href={pkg.href} className="mt-4 block w-full rounded-xl border-2 border-border-soft py-2.5 text-center text-sm font-semibold text-ink transition hover:bg-slate-50">
                View Details
              </Link>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/ready-deals" className="inline-block rounded-xl border-2 border-primary px-6 py-2.5 font-source-sans text-base font-semibold text-primary hover:bg-primary/5">
            See all Ready Deals for your postcode
          </Link>
        </div>
      </div>
      <style jsx>{`
        /* react-range-slider-input base layout + Figma matching styles */
        .filter-range-slider {
          touch-action: none;
          -webkit-tap-highlight-color: transparent;
          -webkit-user-select: none;
          user-select: none;
          cursor: pointer;
          display: block;
          position: relative;
          width: 100%;
          height: 8px;
          background: var(--color-gray-6);
          border-radius: 9999px;
        }

        .filter-range-slider .range-slider__thumb {
          position: absolute;
          z-index: 3;
          top: 50%;
          width: 20px;
          height: 20px;
          transform: translate(-50%, -50%);
          border-radius: 10px;
          background: #ffffff;
          border: 1px solid #314158;
          box-sizing: border-box;
        }

        .filter-range-slider .range-slider__thumb:focus-visible {
          outline: 0;
          box-shadow: none;
        }

        .filter-range-slider .range-slider__range {
          position: absolute;
          z-index: 1;
          transform: translate(0, -50%);
          top: 50%;
          width: 100%;
          height: 100%;
          border-radius: 9999px;
          background-image: linear-gradient(
            173.651deg,
            rgb(32, 148, 243) 0%,
            rgb(23, 207, 207) 100%
          );
        }

        .filter-range-slider input[type="range"] {
          -webkit-appearance: none;
          pointer-events: none;
          position: absolute;
          z-index: 2;
          top: 0;
          left: 0;
          width: 0;
          height: 0;
          background-color: transparent;
        }

        .filter-range-slider input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
        }

        .filter-range-slider input[type="range"]::-moz-range-thumb {
          width: 0;
          height: 0;
          border: 0;
        }
      `}</style>
    </section>
  );
}
