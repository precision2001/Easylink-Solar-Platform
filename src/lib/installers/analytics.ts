import { fetchWithInstallerSession } from "@/lib/installers/installer-fetch-client";

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

export type InstallerPipelineAnalytics = {
  title: {
    headline: string;
    subtitle: string;
  };
  overviewKpis: { label: string; value: string }[];
  statStrip: { label: string; value: string }[];
  primaryKpis: {
    title: string;
    subtitle: string;
    value: string;
    delta: string;
    deltaLabel: string;
    sparkColor: string;
    sparkline: number[];
    icon?: string;
  }[];
  secondaryKpis: {
    title: string;
    value: string;
    delta: string;
    icon: string;
    iconColor: string;
    iconBackgroundColor: string;
  }[];
  monthlyPerformance: {
    months: string[];
    revenue: number[];
    profit: number[];
    installs: number[];
    headline: {
      total: string;
      sub: string;
      yoy: string;
    };
  };
  stcPipeline: {
    badge: string;
    sub: string;
    columns: {
      label: string;
      count: number;
      valueK: number;
      valueLabel: string;
      color: string;
    }[];
  };
  salesFunnelHeader: { leadToInstallPct: string };
  overview: {
    activeDeals: number;
    winRate: number;
    averageDealSize: string;
    totalPipelineValue: string;
    averageSystemSizeKw: number;
  };
  funnelStages: {
    id: string;
    label: string;
    deals: number;
    value: number;
    barUnits: number;
    color: string;
    inkOnBar: "light" | "dark";
    revenueK?: string;
    convFromPrev?: string;
  }[];
  teamRows: {
    rank: number;
    name: string;
    initials: string;
    dealsPct: number;
    conv: string;
    revenue: string;
  }[];
  regionalRows: {
    region: string;
    installs: number;
    avgSize: string;
    trend: string;
    revenue: string;
    meterPct: number;
  }[];
  leadSources: {
    source: string;
    leads: number;
    conv: string;
    revenue: string;
    color: string;
    meterPct: number;
    convTone?: "success" | "muted";
  }[];
  leadMixPcts: number[];
  leadSourceSummary: { totalLeads: string };
  operational: {
    forecastRatio: string;
    forecastTarget: string;
    forecastCoveragePct: number;
    winRate: string;
    winRateDelta: string;
    variance: string;
    varianceDelta: string;
    installTime: string;
    installTimeDelta: string;
    firstFix: string;
    firstFixDelta: string;
    rework: string;
    reworkDelta: string;
    crewUtilisation: string;
    crewUtilisationDelta: string;
    weeklyInstalls: number[];
  };
  businessHealth: {
    nps: number;
    npsLabel: string;
    industryAvg: string;
    npsDelta: string;
    csat: string;
    csatDelta: string;
    reviews: string;
    reviewsSuffix: string;
    cashFlowRows: {
      label: string;
      value: string;
      delta: string;
      meterPct: number;
      tone: "success" | "amber" | "danger";
      icon: string;
    }[];
    dso: string;
    dsoUnit: string;
    dsoDelta: string;
    deposit: string;
    depositDelta: string;
  };
  totals: {
    leads: number;
    won: number;
    lost: number;
  };
};

export async function fetchInstallerPipelineAnalytics(): Promise<InstallerPipelineAnalytics> {
  const res = await fetchWithInstallerSession("/api/installers/analytics/pipeline", {
    cache: "no-store",
  });
  const json = (await res.json()) as ApiEnvelope<InstallerPipelineAnalytics>;
  if (!res.ok || !json.data) {
    throw new Error(json.message || "Failed to load pipeline analytics");
  }
  return json.data;
}

/**
 * Secondary KPIs the backend derives from a fixed margin rather than measures
 * (Net profit is won value × 0.22). Hidden until there is a real source, so
 * the dashboard never presents a formula as a result.
 */
const ESTIMATED_SECONDARY_KPIS = new Set(["net profit"]);

export function measuredSecondaryKpis(
  kpis: InstallerPipelineAnalytics["secondaryKpis"],
): InstallerPipelineAnalytics["secondaryKpis"] {
  return kpis.filter(
    (kpi) => !ESTIMATED_SECONDARY_KPIS.has(kpi.title.trim().toLowerCase()),
  );
}
