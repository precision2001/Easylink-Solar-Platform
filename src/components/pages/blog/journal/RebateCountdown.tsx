"use client";

import Link from "next/link";

import { useNow } from "@/components/pages/blog/journal/useNow";
import { formatChangeDate, nextStep, stepAt } from "@/lib/public/rebate-schedule";

const pad = (n: number) => String(n).padStart(2, "0");

/** Live countdown to the next federal discount step-down, with the before → after numbers. */
export function RebateCountdown({ articleHref }: { articleHref: string | null }) {
  // Null on the server and during hydration; the clock fills in once the page is live.
  const now = useNow(1000);

  const reference = now ?? new Date("2026-11-16T00:00:00Z");
  const current = stepAt(reference);
  const next = nextStep(reference);
  if (!next) return null;

  let ms = now ? Math.max(0, next.from.getTime() - now.getTime()) : 0;
  const d = Math.floor(ms / 86_400_000);
  ms -= d * 86_400_000;
  const h = Math.floor(ms / 3_600_000);
  ms -= h * 3_600_000;
  const m = Math.floor(ms / 60_000);
  ms -= m * 60_000;
  const s = Math.floor(ms / 1000);
  const clock = now
    ? [
        { v: String(d), l: "days" },
        { v: pad(h), l: "hours" },
        { v: pad(m), l: "mins" },
        { v: pad(s), l: "secs" },
      ]
    : [
        { v: "–", l: "days" },
        { v: "–", l: "hours" },
        { v: "–", l: "mins" },
        { v: "–", l: "secs" },
      ];

  return (
    <div className="rounded-[28px] bg-linear-135 from-design-accent-cyan/90 to-yellow-lemon/70 p-0.5">
      <div className="rounded-[26px] bg-customer-card-bg p-7 text-white/80">
        <div className="flex items-center justify-between gap-3">
          <p className="font-inter text-[13px] font-bold uppercase tracking-widest text-yellow-lemon">
            Rebates step down in
          </p>
          <span className="rounded-full bg-leaf px-2.5 py-1 font-inter text-xs font-semibold text-customer-page-bg">Live</span>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2.5" role="timer" aria-live="off" aria-label={`Time until ${formatChangeDate(next.from)}`}>
          {clock.map((c) => (
            <div key={c.l} className="rounded-2xl border border-white/10 bg-navy-900 px-1.5 py-3.5 text-center">
              <p className="font-source-sans text-[40px] font-black leading-none tabular-nums text-white">{c.v}</p>
              <p className="mt-1.5 font-inter text-xs text-white/65">{c.l}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 font-inter text-sm text-white/70">on {formatChangeDate(next.from)}</p>
        <dl className="mt-4 flex flex-col gap-2.5 font-inter text-[15px]">
          {current.batteryFactor !== next.batteryFactor ? (
            <div className="flex justify-between gap-3 border-t border-white/10 pt-3">
              <dt>Battery certificates per kWh</dt>
              <dd className="font-bold text-white">
                {current.batteryFactor} → {next.batteryFactor}
              </dd>
            </div>
          ) : null}
          {current.solarYears !== next.solarYears ? (
            <div className="flex justify-between gap-3 border-t border-white/10 pt-3">
              <dt>Solar &ldquo;years left&rdquo; in the formula</dt>
              <dd className="font-bold text-white">
                {current.solarYears} → {next.solarYears}
              </dd>
            </div>
          ) : null}
        </dl>
        {articleHref ? (
          <Link href={articleHref} className="mt-4 inline-block font-inter text-[15px] font-semibold text-design-accent-cyan hover:text-white">
            What it means for you →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
