import {
  formatOptionPrice,
  type DesignOptionCard,
  type DesignOptions,
} from "@/lib/customers/design-options";
import type { ProjectJourney } from "@/lib/project-journey";

/**
 * Banner and KPI figures for the customer dashboard, derived only from data the
 * page already loads: the project journey and the customer's selected design.
 * Anything not available renders as "—" with a short hint, never a placeholder
 * number.
 */
export const EMPTY_VALUE = "—";

export type DashboardStat = { label: string; value: string };

export type DashboardKpiId =
  | "system-size"
  | "annual-output"
  | "est-savings"
  | "total-price";

export type DashboardKpi = {
  id: DashboardKpiId;
  label: string;
  value: string;
  sublabel: string;
};

export type CustomerDashboardSummary = {
  progressLabel: string;
  stats: DashboardStat[];
  kpis: DashboardKpi[];
};

export function selectedDesignOption(
  options: DesignOptions | null,
): DesignOptionCard | null {
  if (!options) return null;
  return (
    options.options.find((o) => o.selected) ??
    (options.selectedKey
      ? options.options.find((o) => o.key === options.selectedKey)
      : undefined) ??
    null
  );
}

const positive = (v: number | null | undefined): v is number =>
  typeof v === "number" && Number.isFinite(v) && v > 0;

function formatKw(kw: number | null | undefined): string | null {
  return positive(kw) ? `${kw.toFixed(1)} kW` : null;
}

function formatKwh(kwh: number | null | undefined): string | null {
  return positive(kwh)
    ? `${new Intl.NumberFormat("en-AU", { maximumFractionDigits: 0 }).format(kwh)} kWh`
    : null;
}

function formatSavings(v: number | null | undefined): string | null {
  return positive(v) ? `${formatOptionPrice(v)}/yr` : null;
}

function journeyProgressLabel(
  journey: ProjectJourney | null,
  journeyLoading: boolean,
): string {
  if (journeyLoading) return "Loading your project progress…";
  if (!journey) return "Your project progress will show here once your project starts.";
  const pct = Math.max(0, Math.min(100, Math.round(journey.percentComplete)));
  return `Your solar journey is ${pct}% complete`;
}

function currentMilestoneLabel(journey: ProjectJourney | null): string | null {
  if (!journey) return null;
  const current =
    journey.milestones.find((m) => m.key === journey.currentMilestoneKey) ??
    journey.milestones[journey.currentIndex];
  return current?.label?.trim() || null;
}

export function buildCustomerDashboardSummary(input: {
  journey: ProjectJourney | null;
  journeyLoading: boolean;
  designOptions: DesignOptions | null;
  /** True while the design options request is in flight. */
  designsLoading?: boolean;
}): CustomerDashboardSummary {
  const { journey, journeyLoading, designOptions, designsLoading = false } = input;
  const design = selectedDesignOption(designOptions);

  const kw = formatKw(design?.kw);
  const output = formatKwh(design?.annualOutputKwh);
  const savings = formatSavings(design?.estimatedSavings);
  const afterStc = positive(design?.priceAfterStc) ? design.priceAfterStc : null;
  const listPrice = positive(design?.price) ? design.price : null;
  const price = afterStc ?? listPrice;

  const noDesignHint = designsLoading ? "Loading…" : "Choose a design below";

  return {
    progressLabel: journeyProgressLabel(journey, journeyLoading),
    stats: [
      { label: "Selected system", value: kw ?? EMPTY_VALUE },
      { label: "Est. savings", value: savings ?? EMPTY_VALUE },
      { label: "Current step", value: currentMilestoneLabel(journey) ?? EMPTY_VALUE },
    ],
    kpis: [
      {
        id: "system-size",
        label: "System size",
        value: kw ?? EMPTY_VALUE,
        sublabel: !design
          ? noDesignHint
          : positive(design.panelCount)
            ? `${design.panelCount} panels`
            : "Panel count at quote",
      },
      {
        id: "annual-output",
        label: "Annual output",
        value: output ?? EMPTY_VALUE,
        sublabel: !design ? noDesignHint : output ? "projected" : "Estimated at quote",
      },
      {
        id: "est-savings",
        label: "Est. savings",
        value: savings ?? EMPTY_VALUE,
        sublabel: !design ? noDesignHint : savings ? "per year" : "Estimated at quote",
      },
      {
        id: "total-price",
        label: "Total price",
        value: price !== null ? formatOptionPrice(price) : EMPTY_VALUE,
        sublabel: !design
          ? noDesignHint
          : afterStc !== null
            ? "after STC discount, inc. GST"
            : price !== null
              ? "for your selected design"
              : "Confirmed at quote",
      },
    ],
  };
}
