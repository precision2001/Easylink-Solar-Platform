"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { InstallerPipelineAnalytics } from "@/lib/installers/analytics";

const MonthlyPerformanceChartClient = dynamic(
  () =>
    import("./charts/MonthlyPerformanceChartClient").then(
      (m) => m.MonthlyPerformanceChartClient,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[260px] w-full animate-pulse rounded-md bg-cream-200" />
    ),
  },
);

type MonthlyMetricMode = "revenue" | "installs";

// No "Profit" mode: the backend's monthly profit is revenue × 0.22, a fixed
// margin rather than a measured figure, so it is not charted.
const MODES: { key: MonthlyMetricMode; label: string }[] = [
  { key: "revenue", label: "Revenue" },
  { key: "installs", label: "Installs" },
];

export function MonthlyPerformanceSection({
  data,
}: {
  data: InstallerPipelineAnalytics["monthlyPerformance"];
}) {
  const [mode, setMode] = useState<MonthlyMetricMode>("revenue");

  return (
    <section className="rounded-lg border border-warm-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex flex-col gap-3 border-b border-warm-border px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
        <h3 className="font-inter text-[13px] font-bold uppercase tracking-[0.06em] text-brown-muted">
          Monthly Performance
        </h3>
        <div className="flex flex-wrap gap-1 rounded-lg border border-warm-border bg-cream-50 p-0.5">
          {MODES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={`rounded-md px-3 py-1.5 font-inter text-[12px] font-semibold leading-4 transition-colors ${
                mode === key
                  ? "bg-navy-800 text-white shadow-sm"
                  : "text-warm-gray hover:text-warm-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 pb-2 pt-4 md:px-5">
        <div className="mb-4 flex flex-wrap items-baseline gap-3">
          <span className="font-inter text-[28px] font-bold leading-8 tracking-tight text-warm-ink md:text-[32px]">
            {data.headline.total}
          </span>
          <span className="font-inter text-[14px] leading-5 text-warm-gray">
            {data.headline.sub}
          </span>
          <span className="font-inter text-[14px] font-semibold leading-5 text-success">
            {data.headline.yoy}
          </span>
        </div>
        <MonthlyPerformanceChartClient mode={mode} data={data} />
      </div>
    </section>
  );
}
