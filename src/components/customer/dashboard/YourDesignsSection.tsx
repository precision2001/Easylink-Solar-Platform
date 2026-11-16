"use client";

import Link from "next/link";
import { CustomerSectionHeader } from "@/components/customer/CustomerSectionHeader";
import {
  CustomerSectionMetaSkeleton,
  DesignOptionsGridSkeleton,
} from "./CustomerDashboardSkeletons";
import { CustomDesignImageAction } from "./CustomDesignImageAction";
import { DesignOptionCard } from "./DesignOptionCard";
import { DesignOptionsCompare } from "./DesignOptionsCompare";
import { useState } from "react";
import {
  formatOptionPrice,
  type DesignOptionCard as DesignOptionCardData,
} from "@/lib/customers/design-options";

type Props = {
  options: readonly DesignOptionCardData[];
  selectedKey: string | null;
  /** True once the chosen design is approved; selection is then read-only. */
  locked?: boolean;
  loading?: boolean;
  savingKey?: string | null;
  onSelect: (key: string) => void;
  /** True once the customer has been through the /designs wizard at least once. */
  hasCompletedDesignWizard?: boolean;
};

function formatKw(kw: number): string {
  return kw > 0 ? `${kw.toFixed(1)} kW` : "—";
}

function formatOutput(kwh: number): string {
  return kwh > 0 ? `${new Intl.NumberFormat("en-AU").format(kwh)} kWh` : "—";
}

function formatSavings(value: number): string {
  return value > 0 ? `${formatOptionPrice(value)}/yr` : "—";
}

export function YourDesignsSection({
  options,
  selectedKey,
  locked = false,
  loading = false,
  savingKey = null,
  onSelect,
  hasCompletedDesignWizard = true,
}: Props) {
  const selectedCount = selectedKey ? 1 : 0;
  const [view, setView] = useState<"cards" | "compare">("cards");
  const needsDesignWizard = !loading && !hasCompletedDesignWizard;

  return (
    <section
      id="your-designs"
      aria-busy={loading}
      className="customer-panel-bg customer-panel-border-accent overflow-hidden rounded-[14px] border"
    >
      <CustomerSectionHeader
        variant="dark"
        title="Your System Designs"
        meta={
          loading ? (
            <CustomerSectionMetaSkeleton />
          ) : needsDesignWizard ? undefined : (
            `${options.length} options · ${selectedCount} selected`
          )
        }
      />

      {locked ? (
        <p className="border-b customer-card-border px-4 py-2 font-dm-sans text-xs customer-text-muted">
          Your design has been approved, so your choice is locked. Contact your
          installer to change it.
        </p>
      ) : null}

      {loading ? (
        <DesignOptionsGridSkeleton />
      ) : needsDesignWizard ? (
        <div className="flex flex-col items-start gap-3 p-4">
          <p className="font-dm-sans text-sm customer-text-muted">
            You haven&apos;t built a solar design yet. Run the Solar Design
            Platform with your address to see system options here.
          </p>
          <Link
            href="/designs"
            className="rounded-[8px] bg-[linear-gradient(126deg,#2094F3_0%,#17CFCF_100%)] px-4 py-2 font-inter text-[13px] font-semibold text-white shadow-[0px_0px_40px_0px_rgba(140,140,140,0.3)] transition hover:opacity-90"
          >
            Start Solar Design Platform
          </Link>
        </div>
      ) : options.length === 0 ? (
        <p className="p-4 font-dm-sans text-sm customer-text-muted">
          No design options are available yet.
        </p>
      ) : (
        <>
        <div role="tablist" aria-label="How to show your designs" className="flex gap-1 px-4 pt-4">
          {(
            [
              ["cards", "Cards"],
              ["compare", "Compare side by side"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={view === k}
              onClick={() => setView(k)}
              className={`whitespace-nowrap rounded-full px-3 py-1 font-inter text-[12px] font-semibold transition ${
                view === k ? "bg-white text-warm-black" : "border border-white/20 text-white/80 hover:border-white/40"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        {view === "compare" ? (
          <div className="pt-3">
            <DesignOptionsCompare options={options} selectedKey={selectedKey} locked={locked} savingKey={savingKey} onSelect={onSelect} />
          </div>
        ) : (
        <div className="grid grid-cols-1 items-stretch gap-4 p-4 sm:grid-cols-2">
          {options.map((opt) => (
            <DesignOptionCard
              key={opt.key}
              selected={opt.key === selectedKey}
              disabled={locked || savingKey != null}
              onSelect={() => onSelect(opt.key)}
              option={{
                id: opt.key,
                title:
                  savingKey === opt.key ? `${opt.title} — saving…` : opt.title,
                badge: opt.status === "COMPLETED" ? "approved" : "draft",
                kw: formatKw(opt.kw),
                panels: opt.panelCount > 0 ? `${opt.panelCount} panels` : "—",
                price: formatOptionPrice(opt.price),
                savingsPerYr: formatSavings(opt.estimatedSavings),
                outputKwh: formatOutput(opt.annualOutputKwh),
                imageSrc: opt.imageSrc,
                equipment: [opt.batteryKwh ? `${opt.batteryKwh} kWh battery` : opt.batteryKwh === 0 ? "No battery" : null, opt.inverterModel ?? null].filter(Boolean).join(" · ") || undefined,
                afterStc: opt.priceAfterStc ? formatOptionPrice(opt.priceAfterStc) : undefined,
              }}
              imageAction={<CustomDesignImageAction option={opt} />}
            />
          ))}
        </div>
        )}
        </>
      )}
    </section>
  );
}
