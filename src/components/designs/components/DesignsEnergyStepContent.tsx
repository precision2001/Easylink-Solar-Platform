"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import { SingleScrollBar } from "@/components/ui/SingleScrolllBar";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  type DesignBillPeriod,
  mergeProposalData,
  selectDesignProposal,
} from "@/lib/store/designProposalSlice";
import {
  BATTERY_CURVE_SIZES_KWH,
  DAILY_SUPPLY_CHARGE,
  FIT_RATE_PER_KWH,
  GRID_RATE_PER_KWH,
  MONTH_LABELS,
  SOLAR_YIELD_KWH_PER_KW_YEAR,
  EV_FUTURE_DAILY_KWH,
  evReadyBatteryKwh,
  findBatteryKnee,
  resolveSystemKw,
  simulateYear,
  type BatteryMode,
} from "@/lib/designs/energySimulation";

type IconName =
  | "zap"
  | "trendingUp"
  | "leaf"
  | "home"
  | "arrowUpRight"
  | "receipt"
  | "piggyBank"
  | "barChart"
  | "battery";

const ICON_PATHS: Record<IconName, React.ReactNode> = {
  zap: <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />,
  trendingUp: (
    <>
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </>
  ),
  leaf: (
    <>
      <path d="M11 20A7 7 0 0 1 4 13V5a1 1 0 0 1 1-1h8a7 7 0 0 1 7 7v1a8 8 0 0 1-8 8Z" />
      <path d="M4 15s4-1 7-4" />
    </>
  ),
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </>
  ),
  arrowUpRight: (
    <>
      <path d="M7 17 17 7" />
      <path d="M9 7h8v8" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  piggyBank: (
    <>
      <path d="M11 5a6 6 0 0 1 6 6v1l2 1.5V16h-2v2H9v-1a5 5 0 0 1-3-4.58V10a5 5 0 0 1 5-5Z" />
      <circle cx="15" cy="10" r="0.6" fill="currentColor" />
      <path d="M6.5 9 5 8" />
    </>
  ),
  barChart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  battery: (
    <>
      <rect x="2" y="7" width="18" height="10" rx="2" />
      <path d="M22 10v4" />
      <path d="M6 10v4M10 10v4" />
    </>
  ),
};

function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

function SectionHeading({
  icon,
  accentClassName,
  title,
  subtitle,
}: {
  icon: IconName;
  accentClassName: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-1.5">
      <span
        className={`flex size-[22px] shrink-0 items-center justify-center rounded-[6px] ${accentClassName}`}
      >
        <Icon name={icon} className="size-[13px] text-white" />
      </span>
      <div className="min-w-0">
        <h3 className="font-source-sans text-[13px] font-bold leading-tight text-white">
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-0.5 font-inter text-[9.5px] leading-tight text-white/50">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function EnergyMetricPill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex h-[24px] items-center justify-center rounded-[4px] bg-[linear-gradient(126deg,#2094F3_0%,#17CFCF_100%)] px-3 font-source-sans text-[12px] font-bold leading-4 text-white ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function EnergyBreakdownChart({ monthlySolarPct }: { monthlySolarPct: number[] }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col rounded-[10px] border border-[#F3F4F6] bg-white px-2.5 py-2 shadow-[0px_1.201px_3.604px_0px_rgba(0,0,0,0.1),0px_1.201px_2.402px_0px_rgba(0,0,0,0.1)]">
      <div className="flex items-center gap-1.5">
        <span className="flex size-[20px] shrink-0 items-center justify-center rounded-[6px] bg-[linear-gradient(126deg,#2094F3_0%,#17CFCF_100%)]">
          <Icon name="barChart" className="size-3 text-white" />
        </span>
        <h3 className="font-source-sans text-[13px] font-bold tracking-[-0.3px] text-[#101828]">
          Electricity usage breakdown
        </h3>
      </div>

      <div className="mt-1.5 flex min-h-0 flex-1 flex-col">
        <div className="relative flex min-h-0 flex-1 items-end gap-[6px] border-b border-dashed border-[#D9D9D9] px-1 pb-1">
          {monthlySolarPct.map((solarShare, index) => (
            <div
              key={index}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1"
            >
              <div
                className="flex h-full w-full max-w-[18px] flex-col justify-end overflow-hidden rounded-t-sm bg-[#E3E6EC]"
                title={`${MONTH_LABELS[index]}: ${solarShare.toFixed(0)}% from solar`}
              >
                <div
                  className="w-full bg-[#FDE047]"
                  style={{ height: `${solarShare}%` }}
                />
              </div>
              <span className="font-inter text-[10px] font-normal leading-none text-[#666]">
                {MONTH_LABELS[index]}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-1.5 flex items-center justify-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="size-[9px] bg-[#FDE047]" />
            <span className="font-source-sans text-[10px] font-normal text-[#F5C026]">
              From solar
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-[9px] bg-[#E3E6EC]" />
            <span className="font-source-sans text-[10px] font-normal text-[#666]">
              From grid
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Battery size for the house's own usage today. */
const HOME_RED = "#E5383B";
/** Battery size that also charges an EV / covers future heavy loads. */
const EV_GREEN = "#12A150";

/** SVG line chart: annual grid import against battery size, with the "knee" marked. */
function GridImportChart({
  importsBySize,
  currentBatteryKwh,
  currentImportKwh,
  recommendedKwh,
  evReadyKwh,
}: {
  importsBySize: number[];
  currentBatteryKwh: number;
  currentImportKwh: number;
  /** Home-only size (red). */
  recommendedKwh: number;
  /** Home + EV / future heavy loads size (green). */
  evReadyKwh: number;
}) {
  const w = 320;
  const h = 150;
  const padL = 34;
  const padB = 18;
  const padT = 34;
  const padR = 10;
  const maxKwh = BATTERY_CURVE_SIZES_KWH[BATTERY_CURVE_SIZES_KWH.length - 1];
  const maxImport = Math.max(...importsBySize, 1);

  const x = (kwh: number) => padL + (kwh / maxKwh) * (w - padL - padR);
  const y = (imp: number) => padT + (1 - imp / maxImport) * (h - padT - padB);

  const path = BATTERY_CURVE_SIZES_KWH.map(
    (k, i) => `${i === 0 ? "M" : "L"} ${x(k)} ${y(importsBySize[i])}`,
  ).join(" ");

  const kneeIdx = BATTERY_CURVE_SIZES_KWH.indexOf(recommendedKwh);
  const kneeX = x(recommendedKwh);
  const kneeY = y(importsBySize[kneeIdx] ?? 0);
  const evIdx = BATTERY_CURVE_SIZES_KWH.indexOf(evReadyKwh);
  const evX = x(evReadyKwh);
  const evY = y(importsBySize[evIdx] ?? 0);
  const curX = x(Math.min(currentBatteryKwh, maxKwh));
  const curY = y(currentImportKwh);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        className="block min-h-0 w-full flex-1"
      >
        {/* Horizontal gridlines for a more finished, dashboard feel. */}
        {[0.25, 0.5, 0.75].map((frac) => (
          <line
            key={frac}
            x1={padL}
            y1={padT + frac * (h - padT - padB)}
            x2={w - padR}
            y2={padT + frac * (h - padT - padB)}
            stroke="#EEF1F6"
            strokeWidth={1}
          />
        ))}
        <line
          x1={padL}
          y1={h - padB}
          x2={w - padR}
          y2={h - padB}
          stroke="#C7CFDB"
          strokeWidth={1}
        />
        <line x1={padL} y1={padT} x2={padL} y2={h - padB} stroke="#C7CFDB" strokeWidth={1} />

        <text x={padL} y={h - 5} fontSize={9} fill="#8b93a3">
          0
        </text>
        <text x={w - padR} y={h - 5} fontSize={9} fill="#8b93a3" textAnchor="end">
          {maxKwh} kWh
        </text>
        <text x={padL} y={14} fontSize={9} fill="#8b93a3">
          {Math.round(maxImport / 1000)}k kWh/yr
        </text>

        <path d={path} fill="none" stroke="#2FA8E0" strokeWidth={2} strokeLinejoin="round" />

        {/* Band between the two sizes: the storage kept for the EV and future loads. */}
        <rect
          x={kneeX}
          y={padT}
          width={Math.max(0, evX - kneeX)}
          height={h - padT - padB}
          fill={EV_GREEN}
          opacity={0.08}
        />
        <line x1={kneeX} y1={padT} x2={kneeX} y2={h - padB} stroke={HOME_RED} strokeWidth={1} strokeDasharray="3 2" />
        <line x1={evX} y1={padT} x2={evX} y2={h - padB} stroke={EV_GREEN} strokeWidth={1} strokeDasharray="3 2" />
        <rect x={kneeX - 3.5} y={kneeY - 3.5} width={7} height={7} fill={HOME_RED} stroke="#fff" strokeWidth={1.2} />
        <rect x={evX - 3.5} y={evY - 3.5} width={7} height={7} fill={EV_GREEN} stroke="#fff" strokeWidth={1.2} />
        <text x={evX + 3} y={padT + 8} fontSize={7.5} fill={EV_GREEN} fontWeight={700}>
          EV
        </text>
        <circle cx={curX} cy={curY} r={4} fill="#152238" stroke="#fff" strokeWidth={1.2} />
      </svg>

      <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 font-inter text-[8.5px] text-[#6a7282]">
        <span className="flex items-center gap-1">
          <span className="size-[7px]" style={{ background: HOME_RED }} />
          Home only: {recommendedKwh} kWh
        </span>
        <span className="flex items-center gap-1">
          <span className="size-[7px]" style={{ background: EV_GREEN }} />
          Home + EV / future loads: {evReadyKwh} kWh
        </span>
        <span className="flex items-center gap-1">
          <span className="size-[7px] rounded-full bg-[#152238]" />
          Your setting: {currentBatteryKwh} kWh
        </span>
      </div>
    </div>
  );
}

function StatTile({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className={`${TILE_BOX} bg-white`}>
      <p className={`${TILE_LABEL} text-[#6a7282]`}>{label}</p>
      <p className={`${TILE_VALUE} text-[#152238]`}>{value}</p>
      <p className={`${TILE_SUB}`} aria-hidden>&nbsp;</p>
    </div>
  );
}

/*
 * Every tile in the performance and value rows shares one box and three
 * fixed lines — label, amount, kWh (blank when there is none) — so the
 * seven tiles are the same height and their text lines up across the row.
 */
const TILE_BOX =
  "group relative grid h-[108px] min-w-0 flex-1 grid-rows-[28px_28px_16px] content-center justify-items-center gap-1.5 rounded-[10px] px-2 outline-none";
const TILE_LABEL =
  "flex max-w-full items-center justify-center gap-1 self-center text-center font-source-sans text-[9.5px] font-semibold uppercase leading-[13px] tracking-[0.5px]";
const TILE_VALUE = "font-source-sans text-[19px] font-bold leading-7 whitespace-nowrap";
const TILE_SUB = "font-source-sans text-[9px] leading-4 text-white/60";

function ValuePanel({
  icon,
  iconClassName,
  label,
  kwh,
  dollar,
  dollarClassName,
  breakdown,
}: {
  icon: IconName;
  iconClassName: string;
  label: string;
  kwh?: string;
  dollar: string;
  dollarClassName?: string;
  breakdown?: string[];
}) {
  // Compact tile, one row of four, the height of the Grid-free / Export
  // income / Avoided cost tiles above: label, amount, kWh. The workings
  // (bill and net breakdown) show on hover or tap, not in the tile.
  const tip = breakdown && breakdown.length > 0 ? breakdown.join("\n") : undefined;

  return (
    <div
      tabIndex={tip ? 0 : undefined}
      className={`${TILE_BOX} border border-white/10 bg-white/[0.06] focus-visible:ring-1 focus-visible:ring-orange-amber`}
    >
      <div className={`${TILE_LABEL} text-white/80`}>
        <span className={`flex size-3.5 shrink-0 items-center justify-center rounded-[4px] ${iconClassName}`}>
          <Icon name={icon} className="size-2 text-white" />
        </span>
        <span className="line-clamp-2">{label}</span>
        {tip ? <span aria-hidden className="text-white/50">ⓘ</span> : null}
      </div>
      <p className={`${TILE_VALUE} ${dollarClassName ?? "text-white"}`}>{dollar}</p>
      <p className={TILE_SUB}>{kwh ?? "\u00a0"}</p>
      {tip ? (
        <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 hidden w-max max-w-[220px] -translate-x-1/2 flex-col gap-0.5 rounded-[8px] bg-[#152238] px-2 py-1.5 font-inter text-[10px] leading-3.5 text-white shadow-lg group-hover:flex group-focus:flex">
          {breakdown!.map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export type DesignsEnergyStepValue = {
  currentBill: string;
  monthlySavings: string;
  newBill: string;
  yearlySavings: string;
  payback: string;
  billPeriod: DesignBillPeriod;
};

/**
 * Monthly bill slider range ($/mo). The top end is what the period selector
 * multiplies up to the advertised caps: $10k/month, $30k/quarter, $120k/year.
 * The slider works in dollars (not a 0-100 percent) so a notch is $1 rather
 * than ~$99 across this range.
 */
const BILL_MONTHLY_MIN = 100;
const BILL_MONTHLY_MAX = 10000;

/** Used only when a design has no saved bill yet. */
const BILL_MONTHLY_DEFAULT = 500;

function periodMultiplier(period: DesignBillPeriod): number {
  switch (period) {
    case "month":
      return 1;
    case "quarter":
      return 3;
    case "year":
      return 12;
    default:
      return 3;
  }
}

function parseBillPeriod(raw: unknown): DesignBillPeriod {
  if (raw === "month" || raw === "quarter" || raw === "year") {
    return raw;
  }
  return "quarter";
}

function parseMoneyToNumber(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function formatAud(n: number): string {
  return `$${Math.round(n).toLocaleString("en-AU")}`;
}

function clampMonthlyBill(monthly: number): number {
  return Math.min(BILL_MONTHLY_MAX, Math.max(BILL_MONTHLY_MIN, monthly));
}

/** Relative to baseline ($500 -> $368 new bill, $132 savings / mo from design defaults). */
const NEW_BILL_RATIO = 368 / 500;

function deriveEnergyValues(
  currentMonthly: number,
  totalSystemPrice: number | null,
  billPeriod: DesignBillPeriod,
): DesignsEnergyStepValue {
  const newMonthly = Math.round(currentMonthly * NEW_BILL_RATIO);
  const monthlySavings = Math.max(0, currentMonthly - newMonthly);
  const yearlyNum = monthlySavings * 12;

  let payback = "7.1 yrs";
  if (totalSystemPrice != null && totalSystemPrice > 0 && yearlyNum > 0) {
    payback = `${(totalSystemPrice / yearlyNum).toFixed(1)} yrs`;
  }

  return {
    currentBill: formatAud(currentMonthly),
    newBill: formatAud(newMonthly),
    monthlySavings: formatAud(monthlySavings),
    yearlySavings: formatAud(yearlyNum),
    payback,
    billPeriod,
  };
}

export type DesignsEnergyStepHandle = {
  getValues: () => DesignsEnergyStepValue;
};

function EnergyBillInput({
  billPeriod,
  onBillPeriodChange,
  currentMonthlyAmount,
  onMonthlyAmountChange,
  gridRatePerKwh,
  onGridRateChange,
}: {
  billPeriod: DesignBillPeriod;
  onBillPeriodChange: (period: DesignBillPeriod) => void;
  /** Slider basis: normalized monthly AUD (Redux `currentBill` / projections use this). */
  currentMonthlyAmount: number;
  onMonthlyAmountChange: (monthly: number) => void;
  gridRatePerKwh: number;
  onGridRateChange: (rate: number) => void;
}) {
  const [editingRate, setEditingRate] = useState(false);
  const [rateDraft, setRateDraft] = useState("");

  const commitRateDraft = () => {
    const parsed = Number.parseFloat(rateDraft);
    if (Number.isFinite(parsed) && parsed > 0) {
      onGridRateChange(Math.round(parsed * 100000) / 100000);
    }
    setEditingRate(false);
  };
  const displayAmount = Math.round(
    currentMonthlyAmount * periodMultiplier(billPeriod),
  );
  const [draftAmount, setDraftAmount] = useState<string | null>(null);

  const inputValue = draftAmount ?? displayAmount.toLocaleString("en-AU");

  const commitPeriodAmount = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      onMonthlyAmountChange(BILL_MONTHLY_MIN);
      return;
    }

    const periodAmount = Number.parseInt(digits, 10);
    const monthly = Math.round(periodAmount / periodMultiplier(billPeriod));
    onMonthlyAmountChange(clampMonthlyBill(monthly));
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-[16px]">
        <div className="relative h-[58.063px] flex-1 rounded-[10px] border border-[#E5E7EB] bg-white px-4 pr-10">
          <input
            type="text"
            inputMode="numeric"
            value={inputValue}
            onFocus={() => setDraftAmount(String(displayAmount))}
            onChange={(event) => {
              setDraftAmount(event.target.value.replace(/\D/g, ""));
            }}
            onBlur={() => {
              if (draftAmount !== null) {
                commitPeriodAmount(draftAmount);
              }
              setDraftAmount(null);
            }}
            aria-label="Energy bill amount"
            className="size-full bg-transparent font-source-sans text-[24px] font-bold tracking-[0.0703px] text-[#101828] outline-none"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-source-sans text-[16px] font-medium tracking-[-0.3125px] text-[#111]">
            $
          </span>
        </div>
        <select
          value={billPeriod}
          onChange={(e) => {
            setDraftAmount(null);
            onBillPeriodChange(parseBillPeriod(e.target.value));
          }}
          aria-label="Bill amount period"
          className="h-[52.936px] w-[127.984px] shrink-0 cursor-pointer appearance-none rounded-[10px] border border-[#E5E7EB] bg-white pl-3 pr-8 font-source-sans text-[14px] font-semibold tracking-[-0.2px] text-[#101828] outline-none focus-visible:ring-2 focus-visible:ring-design-accent-cyan"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23111828' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 10px center",
          }}
        >
          <option value="month">Month</option>
          <option value="quarter">Quarter</option>
          <option value="year">Year</option>
        </select>
      </div>

      <div className="mt-[16px] flex flex-col items-end gap-[12px]">
        <SingleScrollBar
          value={currentMonthlyAmount}
          onChange={(monthly) => {
            setDraftAmount(null);
            onMonthlyAmountChange(clampMonthlyBill(monthly));
          }}
          min={BILL_MONTHLY_MIN}
          max={BILL_MONTHLY_MAX}
          ariaLabel="Energy bill rate"
        />

        {editingRate ? (
          <div className="inline-flex h-[30px] items-center gap-[6px] rounded-full border border-white px-[13px] py-px">
            <input
              type="number"
              step="0.00001"
              min="0.00001"
              autoFocus
              value={rateDraft}
              onChange={(e) => setRateDraft(e.target.value)}
              onBlur={commitRateDraft}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRateDraft();
                if (e.key === "Escape") setEditingRate(false);
              }}
              aria-label="Grid electricity rate in dollars per kWh"
              className="w-[70px] bg-transparent text-right font-source-sans text-[14px] font-normal text-white outline-none"
            />
            <span className="font-source-sans text-[14px] font-normal text-white">
              $ per kWh
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setRateDraft(String(gridRatePerKwh));
              setEditingRate(true);
            }}
            className="inline-flex h-[30px] items-center gap-[8px] rounded-full border border-white px-[13px] py-px"
          >
            <span className="font-source-sans text-[14px] font-normal tracking-[-0.1504px] text-white">
              {gridRatePerKwh}$ per kWh
            </span>
            <span className="text-[12px] text-white">✎</span>
          </button>
        )}
      </div>
    </div>
  );
}

const BATTERY_MODE_NOTES: Record<BatteryMode, string> = {
  "self-consumption":
    "Battery only discharges to cover household load. Uncaptured solar exports at the flat 5c/kWh feed-in rate.",
  export:
    "Battery holds charge back from the near-zero midday window and sells it during the 4-7pm peak, after household load is covered first.",
};

type ValuePeriod = "day" | "week" | "fortnight" | "month" | "year";
const VALUE_PERIOD_DAYS: Record<ValuePeriod, number> = {
  day: 1,
  week: 7,
  fortnight: 14,
  month: 30.44,
  year: 365,
};
const VALUE_PERIOD_LABELS: Record<ValuePeriod, string> = {
  day: "Day",
  week: "Week",
  fortnight: "Fortnight",
  month: "Month",
  year: "Year",
};

export const DesignsEnergyStepContent = forwardRef<
  DesignsEnergyStepHandle,
  object
>(function DesignsEnergyStepContent(_, ref) {
  const proposal = useAppSelector(selectDesignProposal);
  const dispatch = useAppDispatch();

  const [currentMonthly, setCurrentMonthly] = useState(() =>
    clampMonthlyBill(
      parseMoneyToNumber(proposal.pricing.currentBill) ?? BILL_MONTHLY_DEFAULT,
    ),
  );

  const [billPeriod, setBillPeriod] = useState<DesignBillPeriod>(() =>
    parseBillPeriod(proposal.pricing.billPeriod),
  );

  const [valuePeriod, setValuePeriod] = useState<ValuePeriod>("year");

  const gridRatePerKwh = proposal.pricing.gridRatePerKwh ?? GRID_RATE_PER_KWH;

  const systemKw = useMemo(
    () => resolveSystemKw(proposal.summary.systemSize, proposal.summary.totalPanels),
    [proposal.summary.systemSize, proposal.summary.totalPanels],
  );
  const inverterCount = Math.max(1, Math.ceil(systemKw / 50));

  const annualConsumptionKwh = useMemo(() => {
    const annualUsageCharge = Math.max(
      0,
      currentMonthly * 12 - DAILY_SUPPLY_CHARGE * 365,
    );
    return annualUsageCharge / gridRatePerKwh;
  }, [currentMonthly, gridRatePerKwh]);

  const annualGenerationKwh = systemKw * SOLAR_YIELD_KWH_PER_KW_YEAR;

  const batteryMode: BatteryMode = proposal.equipment.batteryMode ?? "self-consumption";
  const systemAgeYears = proposal.equipment.systemAgeYears ?? 0;
  const batteryKwh = proposal.equipment.batteryCapacityKwh;

  // Seed the battery slider with the recommended size once, the first time
  // this design has no saved value — later bill/roof changes intentionally
  // don't re-seed it, so a manual choice always sticks.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || batteryKwh !== undefined) return;
    seededRef.current = true;
    const knee = findBatteryKnee(annualConsumptionKwh, annualGenerationKwh);
    dispatch(
      mergeProposalData({
        equipment: { batteryCapacityKwh: knee.recommendedKwh },
      }),
    );
    // Runs once to seed the recommended size; subsequent changes are manual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const effectiveBatteryKwh = batteryKwh ?? 0;

  const knee = useMemo(
    () => findBatteryKnee(annualConsumptionKwh, annualGenerationKwh),
    [annualConsumptionKwh, annualGenerationKwh],
  );

  const sim = useMemo(
    () =>
      simulateYear(
        annualConsumptionKwh,
        annualGenerationKwh,
        effectiveBatteryKwh,
        batteryMode,
        systemAgeYears,
        gridRatePerKwh,
      ),
    [
      annualConsumptionKwh,
      annualGenerationKwh,
      effectiveBatteryKwh,
      batteryMode,
      systemAgeYears,
      gridRatePerKwh,
    ],
  );

  const bestCase = useMemo(
    () =>
      simulateYear(
        annualConsumptionKwh,
        annualGenerationKwh,
        500,
        batteryMode,
        systemAgeYears,
        gridRatePerKwh,
      ),
    [annualConsumptionKwh, annualGenerationKwh, batteryMode, systemAgeYears, gridRatePerKwh],
  );

  const independencePct =
    annualConsumptionKwh > 0
      ? Math.max(0, 100 - (sim.annualGridImportKwh / annualConsumptionKwh) * 100)
      : 0;
  const genuineFloorPct =
    annualConsumptionKwh > 0
      ? (bestCase.annualGridImportKwh / annualConsumptionKwh) * 100
      : 0;

  const panelRetentionPct = Math.pow(1 - 0.005, systemAgeYears) * 100;
  const batteryRetentionPct = Math.pow(Math.pow(0.7, 1 / 10), systemAgeYears) * 100;

  const energyValues = useMemo(() => {
    const systemPrice = parseMoneyToNumber(proposal.pricing.totalSystemPrice);
    return deriveEnergyValues(currentMonthly, systemPrice, billPeriod);
  }, [currentMonthly, proposal.pricing.totalSystemPrice, billPeriod]);

  useImperativeHandle(
    ref,
    () => ({
      getValues: () => energyValues,
    }),
    [energyValues],
  );

  // Consumption & solar value card, for the selected period.
  const periodFraction = VALUE_PERIOD_DAYS[valuePeriod] / 365;
  const periodDays = VALUE_PERIOD_DAYS[valuePeriod];
  const consumptionKwhPeriod = annualConsumptionKwh * periodFraction;
  const exportKwhPeriod = sim.annualExportKwh * periodFraction;
  const gridUsedKwhPeriod = sim.annualGridImportKwh * periodFraction;
  const exportIncomePeriod = exportKwhPeriod * FIT_RATE_PER_KWH;
  const gridImportCostPeriod = gridUsedKwhPeriod * gridRatePerKwh;
  const supplyChargePeriod = DAILY_SUPPLY_CHARGE * periodDays;
  const billCostPeriod = supplyChargePeriod + gridImportCostPeriod - exportIncomePeriod;
  const netPeriod = exportIncomePeriod - gridImportCostPeriod - supplyChargePeriod;

  const evReadyKwh = evReadyBatteryKwh(knee.recommendedKwh);
  const homeApplied = batteryKwh === knee.recommendedKwh;
  const evApplied = batteryKwh === evReadyKwh;
  const setBattery = (kwh: number) =>
    dispatch(mergeProposalData({ equipment: { batteryCapacityKwh: Math.round(kwh) } }));

  return (
    <div className="relative z-10 mx-auto flex h-full w-full max-w-[1520px] min-h-0 flex-1 flex-col px-4 py-2 sm:px-6 lg:px-8">
      <div className="mx-auto grid h-full w-full min-h-0 grid-cols-1 gap-3 lg:grid-cols-12 lg:items-stretch lg:gap-4">
        <div className="flex w-full min-w-0 flex-col overflow-y-auto rounded-[20px] border-[3px] border-design-accent-cyan bg-linear-to-r from-yellow-lemon to-orange-amber px-4 py-3 shadow-[0px_0px_40px_0px_rgba(140,140,140,0.3)] lg:col-span-3">
          <div className="mx-auto flex w-full max-w-[400px] flex-col items-center">
            <h2
              className="w-full text-center font-source-sans text-[clamp(16px,1.9vw,21px)] font-bold capitalize leading-[1.12] text-white"
              style={{ letterSpacing: "0.2px" }}
            >
              Design Your Path To $0 Grid Bills
            </h2>

            <div className="mt-2 w-full">
              <EnergyBillInput
                billPeriod={billPeriod}
                onBillPeriodChange={setBillPeriod}
                currentMonthlyAmount={currentMonthly}
                onMonthlyAmountChange={setCurrentMonthly}
                gridRatePerKwh={gridRatePerKwh}
                onGridRateChange={(rate) =>
                  dispatch(mergeProposalData({ pricing: { gridRatePerKwh: rate } }))
                }
              />
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <EnergyMetricPill>
                {proposal.summary.totalPanels || "—"} Panels
              </EnergyMetricPill>
              <EnergyMetricPill>
                {inverterCount} Inverter{inverterCount > 1 ? "s" : ""}
              </EnergyMetricPill>
            </div>
            <p className="mt-1 text-center font-source-sans text-[9.5px] font-normal leading-snug text-[#101828]/75">
              Full roof used — {systemKw.toFixed(1)} kW system, regardless of bill size
            </p>

            {/* Battery sizing */}
            <div className="mt-2 w-full border-t border-white/40 pt-2">
              <div className="flex items-center justify-between">
                <p className="font-source-sans text-[10.5px] font-bold uppercase tracking-[0.5px] text-[#3a3020]">
                  Battery — the lever for $0 grid
                </p>
              </div>
              {homeApplied || evApplied ? (
                <span
                  className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#152238] px-2 py-[2px] font-source-sans text-[9px] font-bold uppercase tracking-[0.4px] text-yellow-lemon"
                >
                  <span className="size-[7px]" style={{ background: homeApplied ? HOME_RED : EV_GREEN }} />
                  {homeApplied ? "Home-only size applied" : "EV-ready size applied"}
                </span>
              ) : null}

              <div className="mt-1.5">
                <div className="flex items-center justify-between font-source-sans text-[11px] font-semibold text-[#3a3020]">
                  <span>Battery capacity</span>
                  <span className="font-mono">{effectiveBatteryKwh} kWh</span>
                </div>
                <div className="relative mt-0.5">
                  {/* Size markers, click to apply: red = this house today, green = + EV / future loads. */}
                  {[
                    { kwh: knee.recommendedKwh, color: HOME_RED, label: "Home only", applied: homeApplied },
                    { kwh: evReadyKwh, color: EV_GREEN, label: "+ EV / future", applied: evApplied },
                  ].map((m) => (
                    <button
                      key={m.label}
                      type="button"
                      onClick={() => setBattery(m.kwh)}
                      title={`${m.label}: ${m.kwh} kWh`}
                      aria-label={`Set battery to ${m.label} size, ${m.kwh} kWh`}
                      className="absolute top-[-2px] z-10 flex -translate-x-1/2 flex-col items-center"
                      style={{ left: `${Math.min(100, m.kwh)}%` }}
                    >
                      <span
                        className="rounded-[3px] border-2 bg-white/85 px-1 font-mono text-[8.5px] font-bold leading-[13px]"
                        style={{ borderColor: m.color, color: m.color, boxShadow: m.applied ? `0 0 0 2px ${m.color}55` : undefined }}
                      >
                        {m.kwh}
                      </span>
                      <span className="h-[6px] w-[2px]" style={{ background: m.color }} />
                    </button>
                  ))}
                  <div className="pt-[14px]">
                    <SingleScrollBar
                      value={effectiveBatteryKwh}
                      onChange={setBattery}
                      min={0}
                      max={100}
                      ariaLabel="Battery capacity in kWh"
                    />
                  </div>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 font-inter text-[8.5px] leading-[1.2] text-[#3a3020]/85">
                  <span className="flex items-center gap-1">
                    <span className="size-[7px] border-2" style={{ borderColor: HOME_RED }} />
                    Home only — today&apos;s usage
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-[7px] border-2" style={{ borderColor: EV_GREEN }} />
                    + EV charging / future loads (+{EV_FUTURE_DAILY_KWH} kWh/day)
                  </span>
                </div>
              </div>

              <div className="mt-1.5 flex gap-1.5">
                {(["self-consumption", "export"] as BatteryMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      dispatch(mergeProposalData({ equipment: { batteryMode: mode } }))
                    }
                    className={`flex-1 rounded-[7px] px-1.5 py-1 font-source-sans text-[10px] font-semibold transition ${
                      batteryMode === mode
                        ? "bg-[#152238] text-yellow-lemon"
                        : "bg-white/40 text-[#3a3020] hover:bg-white/60"
                    }`}
                  >
                    {mode === "self-consumption" ? "Self-Consumption" : "Export-Optimized"}
                  </button>
                ))}
              </div>
              <p className="mt-1 font-inter text-[9px] leading-[1.25] text-[#3a3020]/80">
                {BATTERY_MODE_NOTES[batteryMode]}
              </p>

              <div className="mt-1.5">
                <div className="flex items-center justify-between font-source-sans text-[11px] font-semibold text-[#3a3020]">
                  <span>System age</span>
                  <span className="font-mono">
                    {systemAgeYears === 0 ? "Year 0 (new)" : `Year ${systemAgeYears}`}
                  </span>
                </div>
                <div className="mt-0.5">
                  <SingleScrollBar
                    value={systemAgeYears}
                    onChange={(v) =>
                      dispatch(
                        mergeProposalData({
                          equipment: { systemAgeYears: Math.round(v) },
                        }),
                      )
                    }
                    min={0}
                    max={25}
                    ariaLabel="System age in years"
                  />
                </div>
                {systemAgeYears > 0 ? (
                  <p className="mt-1 font-inter text-[9px] leading-[1.25] text-[#3a3020]/80">
                    At year {systemAgeYears}: panels at {panelRetentionPct.toFixed(0)}% output,
                    battery at {batteryRetentionPct.toFixed(0)}% capacity.
                  </p>
                ) : null}
              </div>

              {independencePct < 99 ? (
                <div className="mt-1.5 rounded-[7px] bg-white/60 px-2 py-1.5 font-inter text-[9px] leading-[1.3] text-[#5a3a24]">
                  {genuineFloorPct < 1
                    ? `${(100 - independencePct).toFixed(0)}% still draws from the grid at this battery size — but generation covers usage every month, so $0 grid is reachable with more storage.`
                    : `${(100 - independencePct).toFixed(0)}% still draws from the grid, and ~${genuineFloorPct.toFixed(0)}% is unavoidable even with a very large battery — some months' generation falls short of that month's usage.`}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="designs-border-gradient flex w-full min-w-0 min-h-0 rounded-[20px] p-[3px] shadow-[0px_0px_40px_0px_rgba(140,140,140,0.3)] lg:col-span-9">
          <div className="flex min-h-0 w-full flex-col gap-2 overflow-y-auto rounded-[18px] bg-[linear-gradient(135deg,rgba(48,54,71,0.98)_0%,rgba(33,36,47,0.98)_100%)] px-3 py-2.5 backdrop-blur-[17.8px]">
            {/* Four-up dashboard: performance + value on top, usage + battery curve below — mirrors the client's no-scroll layout. */}
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2 sm:grid-rows-[auto_1fr]">
              {/* System performance */}
              <div className="flex flex-col rounded-[10px] border border-white/10 bg-white/5 px-2.5 py-2">
                <SectionHeading
                  icon="zap"
                  accentClassName="bg-[linear-gradient(126deg,#2094F3_0%,#17CFCF_100%)]"
                  title="System performance"
                  subtitle="At the battery size and mode set on the left"
                />
                <div className="mt-auto pt-2">
                  <div className="flex items-center gap-1.5">
                    <StatTile value={`${independencePct.toFixed(0)}%`} label="Grid-free" />
                    <StatTile value={formatAud(sim.exportIncomeAud)} label="Export income/yr" />
                    <StatTile value={formatAud(sim.avoidedCostAud)} label="Avoided cost/yr" />
                  </div>
                </div>
              </div>

              {/* Consumption & solar value */}
              <div className="flex flex-col rounded-[10px] border border-white/10 bg-white/5 px-2.5 py-2">
                <SectionHeading
                  icon="receipt"
                  accentClassName="bg-linear-to-r from-yellow-lemon to-orange-amber"
                  title="Consumption & solar value"
                />

                {/* Period: five equal frosted glass buttons across the card; the
                    chosen one in the EasyLink logo yellow-gold. Defaults to Year. */}
                <div
                  role="tablist"
                  aria-label="Period"
                  className="mt-1.5 grid grid-cols-5 gap-1 rounded-[12px] border border-white/[0.18] bg-white/[0.06] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md"
                >
                  {(Object.keys(VALUE_PERIOD_LABELS) as ValuePeriod[]).map((p) => {
                    const on = valuePeriod === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        role="tab"
                        aria-selected={on}
                        onClick={() => setValuePeriod(p)}
                        className={`relative h-[30px] overflow-hidden rounded-[9px] border font-source-sans text-[12px] tracking-[0.3px] transition before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-[linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0)_100%)] ${
                          on
                            ? "border-[rgba(255,245,170,0.9)] bg-[linear-gradient(133deg,rgba(255,239,98,0.97)_0%,rgba(255,200,40,0.95)_45%,rgba(247,141,0,0.95)_100%)] font-bold text-[#152238] shadow-[0_0_18px_rgba(247,141,0,0.45),inset_0_1px_0_rgba(255,255,255,0.5)]"
                            : "border-white/[0.18] bg-[linear-gradient(156deg,rgba(32,148,243,0.28)_0%,rgba(23,207,207,0.18)_100%)] font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-[linear-gradient(156deg,rgba(32,148,243,0.42)_0%,rgba(23,207,207,0.3)_100%)]"
                        }`}
                      >
                        <span className="relative">{VALUE_PERIOD_LABELS[p]}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-auto grid grid-cols-2 gap-1.5 pt-2 sm:grid-cols-4">
                  <ValuePanel
                    icon="home"
                    iconClassName="bg-[linear-gradient(126deg,#2094F3_0%,#17CFCF_100%)]"
                    label="House consumption"
                    kwh={`${consumptionKwhPeriod.toLocaleString(undefined, { maximumFractionDigits: 1 })} kWh`}
                    dollar={formatAud(consumptionKwhPeriod * gridRatePerKwh)}
                  />
                  <ValuePanel
                    icon="arrowUpRight"
                    iconClassName="bg-linear-to-r from-yellow-lemon to-orange-amber"
                    label="Export to grid"
                    kwh={`${exportKwhPeriod.toLocaleString(undefined, { maximumFractionDigits: 1 })} kWh`}
                    dollar={formatAud(exportIncomePeriod)}
                  />
                  <ValuePanel
                    icon="receipt"
                    iconClassName="bg-white/20"
                    label="Electricity bill cost"
                    dollar={
                      billCostPeriod >= 0
                        ? formatAud(billCostPeriod)
                        : `${formatAud(Math.abs(billCostPeriod))} credit`
                    }
                    dollarClassName={billCostPeriod < 0 ? "text-[#3ecf7a]" : "text-white"}
                    breakdown={[
                      `Supply charge ${formatAud(supplyChargePeriod)}`,
                      `+ Grid usage ${formatAud(gridImportCostPeriod)}`,
                      `− Export credit ${formatAud(exportIncomePeriod)}`,
                    ]}
                  />
                  <ValuePanel
                    icon="piggyBank"
                    iconClassName={
                      netPeriod >= 0
                        ? "bg-[linear-gradient(126deg,#2094F3_0%,#17CFCF_100%)]"
                        : "bg-linear-to-r from-yellow-lemon to-orange-amber"
                    }
                    label="Solar net profit/loss"
                    dollar={`${netPeriod >= 0 ? "+" : "−"}${formatAud(Math.abs(netPeriod))}`}
                    dollarClassName={netPeriod >= 0 ? "text-[#3ecf7a]" : "text-orange-amber"}
                    breakdown={[
                      `Generated ${(sim.annualGeneratedKwh * periodFraction).toFixed(1)} kWh`,
                      `→ Stored ${(sim.annualStoredKwh * periodFraction).toFixed(1)} kWh`,
                      `→ Exported ${exportKwhPeriod.toFixed(1)} kWh (+${formatAud(exportIncomePeriod)})`,
                      `→ Grid used ${gridUsedKwhPeriod.toFixed(1)} kWh (−${formatAud(gridImportCostPeriod)})`,
                      `→ Supply −${formatAud(supplyChargePeriod)}`,
                    ]}
                  />
                </div>
              </div>

              {/* Grid import vs battery size */}
              <div className="flex min-h-[260px] flex-col rounded-[10px] border border-white/10 bg-white/5 px-2.5 py-2">
                <SectionHeading
                  icon="battery"
                  accentClassName="bg-[#152238]"
                  title="Grid import vs. battery size"
                  subtitle="Red: enough for the house today. Green: also charges an EV / future loads"
                />
                <div className="mt-1.5 min-h-0 flex-1 rounded-[10px] bg-white px-2 py-1.5">
                  <GridImportChart
                    importsBySize={knee.importsBySize}
                    currentBatteryKwh={effectiveBatteryKwh}
                    currentImportKwh={sim.annualGridImportKwh}
                    recommendedKwh={knee.recommendedKwh}
                    evReadyKwh={evReadyKwh}
                  />
                </div>
              </div>

              {/* Electricity usage breakdown */}
              <EnergyBreakdownChart
                monthlySolarPct={sim.monthly.map((m) => m.solarPct)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
