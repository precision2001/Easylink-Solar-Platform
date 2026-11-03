"use client";

import dynamic from "next/dynamic";
import type { InstallerPipelineAnalytics } from "@/lib/installers/analytics";

const WeeklyInstallBarClient = dynamic(
  () =>
    import("./charts/WeeklyInstallBarClient").then(
      (m) => m.WeeklyInstallBarClient,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[64px] w-full animate-pulse rounded-md bg-cream-200" />
    ),
  },
);

type CashFlowTone = "success" | "amber" | "danger";

export function PipelineOperationalHealth({
  operational,
  businessHealth,
}: {
  operational: InstallerPipelineAnalytics["operational"];
  businessHealth: InstallerPipelineAnalytics["businessHealth"];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="space-y-4">
        <section className="overflow-hidden rounded-[10px] border border-warm-border bg-cream-50 shadow-sm">
          <div className="flex min-h-[42px] items-center gap-2 border-l-2 border-yellow-lemon bg-linear-to-b from-amber-hot/15 to-transparent pl-[18px] pr-4">
            <span className="font-dm-sans text-[14px] text-warm-ink">◎</span>
            <h3 className="font-inter text-[12px] font-bold uppercase leading-[18px] tracking-[0.3px] text-warm-ink">
              Forecast Accuracy
            </h3>
          </div>
          <div className="space-y-4 p-4 md:p-4">
            <div className="flex items-end justify-between gap-4">
              <p className="font-dm-sans text-[12px] font-semibold leading-[18px] text-warm-ink">
                Pipeline Coverage Ratio
              </p>
              <p className="font-inter text-[20px] font-bold leading-[27px] text-warm-ink">
                {operational.forecastRatio}
              </p>
            </div>
            <div className="h-[10px] overflow-hidden rounded-full bg-cream-300">
              <div
                className="h-full rounded-full bg-linear-to-r from-yellow-lemon to-orange-amber"
                style={{ width: `${operational.forecastCoveragePct}%` }}
              />
            </div>
            <div className="flex justify-end">
              <span className="font-dm-sans text-[10px] font-normal leading-[15px] text-warm-gray">
                {operational.forecastTarget}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-warm-border bg-white px-3 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-dm-sans text-[11px] text-orange-amber">
                    ▥
                  </span>
                  <p className="font-dm-sans text-[10px] font-normal uppercase tracking-[0.3px] text-warm-gray">
                    Win Rate
                  </p>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <p className="font-inter text-[20px] font-bold leading-[30px] text-warm-ink">
                    {operational.winRate}
                  </p>
                  <span className="font-dm-sans text-[10px] font-semibold leading-[15px] text-success">
                    ↗ {operational.winRateDelta}
                  </span>
                </div>
              </div>
              <div className="rounded-lg border border-warm-border bg-white px-3 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-dm-sans text-[11px] text-navy-800">
                    ↗
                  </span>
                  <p className="font-dm-sans text-[10px] font-normal uppercase tracking-[0.3px] text-warm-gray">
                    Forecast Variance
                  </p>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <p className="font-inter text-[20px] font-bold leading-[30px] text-warm-ink">
                    {operational.variance}
                  </p>
                  <span className="font-dm-sans text-[10px] font-semibold leading-[15px] text-success">
                    ↘ {operational.varianceDelta}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[10px] border border-warm-border bg-cream-50 shadow-sm">
          <div className="flex min-h-[42px] items-center gap-2 border-l-2 border-yellow-lemon bg-linear-to-b from-amber-hot/15 to-transparent pl-[18px] pr-4">
            <span className="font-dm-sans text-[14px] text-warm-ink">🔧</span>
            <h3 className="font-inter text-[12px] font-bold uppercase leading-[18px] tracking-[0.3px] text-warm-ink">
              Installation Efficiency
            </h3>
          </div>
          <div className="space-y-4 p-4">
            {/* Rework rate is left out: the backend reports lost leads as
                "rework", which is not what the label claims. */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <InstallMetricCard
                label="Avg. Install Time"
                value={operational.installTime}
                delta={operational.installTimeDelta}
              />
              <InstallMetricCard
                label="First-Time Fix Rate"
                value={operational.firstFix}
                delta={operational.firstFixDelta}
              />
              <InstallMetricCard
                label="Crew Utilisation"
                value={operational.crewUtilisation}
                delta={operational.crewUtilisationDelta}
              />
            </div>
            <p className="font-dm-sans text-[10px] font-normal uppercase tracking-[0.3px] text-warm-gray">
              Weekly Install Trend
            </p>
            <WeeklyInstallBarClient values={operational.weeklyInstalls} />
          </div>
        </section>
      </div>

      <div className="space-y-4">
        {/* No customer satisfaction panel: the backend's NPS, CSAT, star
            rating and review count are formulas of the win rate, not survey
            or review data, so they are not shown until a real source exists. */}
        <section className="overflow-hidden rounded-[10px] border border-warm-border bg-cream-50 shadow-sm">
          <div className="flex min-h-[42px] items-center gap-2 border-l-2 border-yellow-lemon bg-linear-to-b from-amber-hot/15 to-transparent pl-[18px] pr-4">
            <span className="font-dm-sans text-[14px] text-warm-ink">$</span>
            <h3 className="font-inter text-[12px] font-bold uppercase leading-[18px] tracking-[0.3px] text-warm-ink">
              Cash Flow Indicators
            </h3>
          </div>
          <div className="space-y-3 p-4">
            {businessHealth.cashFlowRows.map((row) => (
              <CashFlowRow
                key={row.label}
                icon={row.icon}
                label={row.label}
                value={row.value}
                delta={row.delta}
                meterPct={row.meterPct}
                tone={row.tone}
              />
            ))}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="rounded-lg border border-warm-border bg-white px-3 py-3">
                <p className="font-dm-sans text-[10px] font-normal uppercase tracking-[0.3px] text-warm-gray">
                  Days Sales Outstanding
                </p>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <div className="flex items-end gap-1">
                    <p className="font-inter text-[20px] font-bold leading-[30px] text-warm-ink">
                      {businessHealth.dso}
                    </p>
                    <span className="pb-0.5 font-dm-sans text-[10px] font-normal leading-[15px] text-warm-gray">
                      {businessHealth.dsoUnit}
                    </span>
                  </div>
                  <span className="font-dm-sans text-[10px] font-semibold leading-[15px] text-success">
                    ↘ {businessHealth.dsoDelta}
                  </span>
                </div>
              </div>
              <div className="rounded-lg border border-warm-border bg-white px-3 py-3">
                <p className="font-dm-sans text-[10px] font-normal uppercase tracking-[0.3px] text-warm-gray">
                  Deposit Collection Rate
                </p>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <p className="font-inter text-[20px] font-bold leading-[30px] text-warm-ink">
                    {businessHealth.deposit}
                  </p>
                  <span className="font-dm-sans text-[10px] font-semibold leading-[15px] text-success">
                    ↗ {businessHealth.depositDelta}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function InstallMetricCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta: string;
}) {
  return (
    <div className="rounded-lg border border-warm-border bg-white px-3 py-3">
      <p className="font-dm-sans text-[10px] font-normal uppercase tracking-[0.3px] text-warm-gray">
        {label}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <p className="font-inter text-[20px] font-bold leading-[27px] text-warm-ink">
          {value}
        </p>
        <span className="font-dm-sans text-[10px] font-semibold leading-[15px] text-success">
          ↗ {delta}
        </span>
      </div>
    </div>
  );
}

function CashFlowRow({
  icon,
  label,
  value,
  delta,
  meterPct,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  delta: string;
  meterPct: number;
  tone: CashFlowTone;
}) {
  const meterClass =
    tone === "danger"
      ? "bg-red-600"
      : tone === "amber"
        ? "bg-orange-amber"
        : "bg-success";

  const iconClass =
    tone === "danger"
      ? "text-red-500"
      : tone === "amber"
        ? "text-orange-amber"
        : "text-success";

  return (
    <div className="rounded-lg border border-warm-border bg-white px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-dm-sans text-[14px] leading-none ${iconClass}`}
          >
            {icon}
          </span>
          <p className="font-dm-sans text-[10px] font-normal uppercase tracking-[0.3px] text-warm-gray">
            {label}
          </p>
        </div>
        <span className="font-dm-sans text-[10px] font-semibold leading-[15px] text-success">
          ↗ {delta}
        </span>
      </div>
      <p className="mt-1 font-inter text-[20px] font-bold leading-[27px] text-warm-ink">
        {value}
      </p>
      <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-cream-300">
        <div
          className={`h-full rounded-full ${meterClass}`}
          style={{ width: `${meterPct}%` }}
        />
      </div>
    </div>
  );
}
