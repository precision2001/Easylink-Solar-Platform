"use client";

import Icon, { IconType } from "@/components/ui/Icons";
import {
  measuredSecondaryKpis,
  type InstallerPipelineAnalytics,
} from "@/lib/installers/analytics";

export function PipelineSecondaryKpiRow({
  kpis,
}: {
  kpis: InstallerPipelineAnalytics["secondaryKpis"];
}) {
  // Net profit is a fixed-margin estimate on the backend, not a measurement.
  const shown = measuredSecondaryKpis(kpis);
  return (
    <div
      className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${
        shown.length === 3 ? "xl:grid-cols-3" : "xl:grid-cols-4"
      }`}
    >
      {shown.map((item) => (
        <div
          key={item.title}
          className="flex items-start gap-3 rounded-lg border border-warm-border bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: item.iconBackgroundColor }}>
            <Icon name={item.icon as IconType || "Light"} className="size-4" style={{ color: item.iconColor, opacity: 1 }} />
          </span>
          <div className="min-w-0">
            <p className="font-inter text-[13px] font-medium leading-[15px] text-brown-muted">
              {item.title}
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className="font-inter text-[22px] font-bold leading-7 text-warm-ink">
                {item.value}
              </span>
              {item.delta ? (
                <span className="font-inter text-[13px] font-semibold text-success">
                  {item.delta}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
