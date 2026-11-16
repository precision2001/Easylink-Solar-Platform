"use client";

import Link from "next/link";
import { useState } from "react";

import { useNow } from "@/components/pages/blog/journal/useNow";

import { discountFor, formatAud, formatChangeDate, nextStep, stepAt } from "@/lib/public/rebate-schedule";

/** Two sliders: what the federal discount is now vs after the next step-down (Sydney estimate). */
export function RebateCheck() {
  const [kw, setKw] = useState(10);
  const [kwh, setKwh] = useState(20);
  const now = useNow(0);

  const reference = now ?? new Date("2026-11-16T00:00:00Z");
  const current = stepAt(reference);
  const next = nextStep(reference);
  if (!next) return null;

  const before = discountFor(current, kw, kwh);
  const after = discountFor(next, kw, kwh);
  const diff = Math.max(0, before - after);
  const changeDate = formatChangeDate(next.from);
  const afterPct = before > 0 ? Math.round((after / before) * 100) : 100;

  return (
    <section
      id="rebate-check"
      aria-labelledby="rebate-check-h"
      className="flex scroll-mt-28 flex-wrap items-stretch gap-11 rounded-[32px] border border-white/10 bg-customer-card-bg p-8 text-white/80 sm:p-11"
    >
      <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5">
        <p className="font-inter text-[13px] font-bold uppercase tracking-[0.12em] text-design-accent-cyan">Rebate check</p>
        <h2 id="rebate-check-h" className="font-source-sans text-[40px] font-black leading-[1.05] text-white">
          What does waiting until {changeDate.replace(/ \d{4}$/, "")} cost you?
        </h2>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between gap-3 font-inter">
            <label htmlFor="rebate-kw" className="font-semibold text-white">
              Solar system size
            </label>
            <span className="font-extrabold text-yellow-lemon">{kw === 0 ? "None" : `${kw.toFixed(1)} kW`}</span>
          </div>
          <input
            id="rebate-kw"
            type="range"
            min={0}
            max={20}
            step={0.1}
            value={kw}
            onChange={(e) => setKw(Number(e.target.value))}
            className="blog-range h-7 w-full"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between gap-3 font-inter">
            <label htmlFor="rebate-kwh" className="font-semibold text-white">
              Battery usable capacity
            </label>
            <span className="font-extrabold text-yellow-lemon">{kwh === 0 ? "None" : `${kwh} kWh`}</span>
          </div>
          <input
            id="rebate-kwh"
            type="range"
            min={0}
            max={50}
            step={0.5}
            value={kwh}
            onChange={(e) => setKwh(Number(e.target.value))}
            className="blog-range h-7 w-full"
          />
        </div>
        <p className="font-inter text-[13px] leading-relaxed text-white/60">
          Estimate for Sydney (STC zone 3) at about $38 per certificate. Your discount depends on your postcode, products and
          the certificate price on the day.
        </p>
      </div>

      <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-3.5" aria-live="polite">
        <div className="grid grid-cols-2 gap-3.5">
          <div className="rounded-[20px] border border-leaf/45 bg-navy-900 p-5">
            <p className="font-inter text-sm text-white/70">Installed before {changeDate}</p>
            <p className="mt-2 font-source-sans text-[40px] font-black text-white">{formatAud(before)}</p>
          </div>
          <div className="rounded-[20px] border border-white/10 bg-navy-900 p-5">
            <p className="font-inter text-sm text-white/70">Installed from {changeDate}</p>
            <p className="mt-2 font-source-sans text-[40px] font-black text-white/85">{formatAud(after)}</p>
          </div>
        </div>
        <div className="blog-sun-gradient flex flex-wrap items-center justify-between gap-4 rounded-[20px] px-6 py-6 text-customer-page-bg">
          <div>
            <p className="font-inter text-sm font-bold">You&apos;d get less by waiting</p>
            <p className="mt-1 font-source-sans text-[52px] font-black leading-none">{diff > 0 ? `−${formatAud(diff)}` : "$0"}</p>
          </div>
          <Link
            href="/designs"
            className="rounded-full bg-customer-page-bg px-5 py-3.5 font-inter font-bold text-white transition hover:brightness-125"
          >
            Lock in this year&apos;s rate
          </Link>
        </div>
        <div aria-hidden="true" className="mt-1.5 flex flex-col gap-2">
          <div className="h-3 rounded-md bg-white/10">
            <div className="h-3 w-full rounded-md bg-leaf" />
          </div>
          <div className="h-3 rounded-md bg-white/10">
            <div className="h-3 rounded-md bg-white/45" style={{ width: `${afterPct}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
}
