"use client";

import { useMemo, useState } from "react";

import {
  BATTERIES,
  BATTERY_SIZES,
  DCAC_LIMIT,
  DCAC_LIMIT_WITH_BATTERY,
  INVERTERS,
  PANEL_KW,
  PERIOD_DAYS,
  type BatteryMode,
  type Period,
  type Role,
  STC_PRICE,
  STEP_NAMES,
  TIERS,
  defaultsFor,
  finalStepName,
  generation,
  importCurve,
  lifetimeSavings,
  money,
  priceSystem,
  profileFor,
  recommendedBattery,
  simulate,
  yearlyConsumption,
} from "@/lib/designer/simulation";
import { dcAcLimitLabel, dcAcLimitPercent } from "@/lib/designer/designRules";

/**
 * Matches the Easylink Designer "Solar designer" mock (DesignerBody.dc.html)
 * as the Operations role sees it — a nine-step wizard that measures the roof,
 * sizes the system to a power bill and prices it off the shared catalogue.
 *
 * The arithmetic lives in @/lib/designer/simulation and is covered by tests;
 * this file is the chrome around it. Every control is live: changing the bill,
 * the battery slider, the mode or the panel count re-runs the full twelve-month
 * simulation, because watching the numbers move is the point of the tool.
 *
 * Sample data: the property, roof measurements and catalogue are the mock's.
 */

const SUNLIGHT = "#FFE866";
const SUN = "#F68A0A";
const SUN_INK = "#3B1D00";
const NAVY = "#0B1A2E";
const NAVY_2 = "#13263F";
const NAVY_3 = "#1B3557";
const NAVY_LINE = "#2A4466";
const NAV_TEXT = "#C3CFDF";
const WHITE = "#FFFFFF";
const INK = "#0F172A";
const SLATE = "#475569";
const BLUE = "#1976D2";
const GREEN = "#166534";

const SUN_GRAD = `linear-gradient(90deg, ${SUNLIGHT}, ${SUN})`;
const SUN_GRAD_135 = `linear-gradient(135deg, ${SUNLIGHT}, ${SUN})`;

const FIELD =
  "h-12 rounded-[12px] border border-[#CBD5E1] px-3.5 text-[15px] text-[#0F172A] bg-white";
const LABEL = "text-[13px] font-semibold text-[#334155]";
const CARD_W = "rounded-[16px] bg-white p-3.5 flex flex-col gap-2.5 text-[#0F172A]";

const MONTH_INITIAL = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTH_NAME = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ICON = {
  pv: "M4 9h16l-2 11H6zM9 9l-1 11M15 9l1 11M4.9 14.5h14.2M12 2v3M5.6 4.6l1.4 1.4M18.4 4.6 17 6",
  inv: "M18 12h2M18 16h2M18 20h2M18 4h2M18 8h2M4 12h2M4 16h2M4 20h2M4 4h2M4 8h2M8 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-1.5c-.276 0-.494.227-.562.495a2 2 0 0 1-3.876 0C9.994 2.227 9.776 2 9.5 2z",
  bat: "M15 7h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2M6 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h1M11 7l-3 5h4l-3 5M22 11L22 13",
  ev: "M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4ZM2 22l3-3M7.5 13.5 10 11M10.5 16.5 13 14M18 3l-4 4h6l-4 4",
  hp: "M11 8c2-3-2-3 0-6M15.5 8c2-3-2-3 0-6M6 10h.01M6 14h.01M10 16v-4M14 16v-4M18 16v-4M20 6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3M5 20v2M19 20v2",
};

const PROPERTY_TYPES: [string, string, string, string][] = [
  [
    "res",
    "Residential",
    "A house or townhouse you own",
    "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  ],
  [
    "com",
    "Commercial",
    "Shop, office, warehouse or farm",
    "M2 7l4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4M2 7h20M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7",
  ],
  [
    "apt",
    "Apartments",
    "Unit block or strata building",
    "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18ZM6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2M10 6h4M10 10h4M10 14h4M10 18h4",
  ],
];

const PROPERTY_NOTES: Record<string, string> = {
  res: "",
  com: "Commercial systems over 30 kW need a three-phase design and network approval. We’ll pass this to the commercial team after the first steps.",
  apt: "Apartments use the shared roof, so the owners corporation needs to approve. We’ll design for your share of the roof.",
};

function Icon({ d, size = 18, stroke = SUNLIGHT, width = 2.4 }: { d: string; size?: number; stroke?: string; width?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: `0 0 ${size}px` }}
    >
      <path d={d} />
    </svg>
  );
}

const TICK = "M20 6 9 17l-5-5";

export function MasterDesignerBody({ role = "distributor", start = 6 }: { role?: Role; start?: number }) {
  const d = useMemo(() => defaultsFor(role), [role]);
  const p = useMemo(() => profileFor(role), [role]);

  const [step, setStep] = useState(start);
  const [propType, setPropType] = useState("res");
  const [name, setName] = useState(d.name);
  const [email, setEmail] = useState(d.email);
  const [phone, setPhone] = useState(d.phone);
  const [sms, setSms] = useState(role !== "public");
  const [zoom, setZoom] = useState(20);
  const [view, setView] = useState<"rgb" | "panels" | "edit">("panels");
  const [bill, setBill] = useState(d.bill);
  const [days, setDays] = useState(91);
  const [rate, setRate] = useState(0.37);
  const [fit, setFit] = useState(0.05);
  const [battery, setBattery] = useState(d.battery);
  const [batterySel, setBatterySel] = useState(d.batterySel);
  const [mode, setMode] = useState<BatteryMode>("self");
  const [age, setAge] = useState(0);
  const [period, setPeriod] = useState<Period>("year");
  const [panels, setPanels] = useState(d.panels);
  const [inverterKey, setInverterKey] = useState(d.inverter);
  const [ev, setEv] = useState(d.ev);
  const [heatPump, setHeatPump] = useState(d.heatPump);
  const [tier, setTier] = useState("prem");
  const [auth, setAuth] = useState<"create" | "signin">("create");
  const [done, setDone] = useState("");

  const pub = role === "public";
  const dist = role === "distributor";
  const inverter = INVERTERS[inverterKey];

  const arrayKw = panels * PANEL_KW;
  const kwdc = (Math.round(arrayKw * 100) / 100).toString();
  const ratio = Math.round((arrayKw / inverter.kw) * 100);
  // 200% once a battery is in the design (CEC guideline), else the 133% STC rule.
  const withBattery = battery > 0;
  const limitPct = dcAcLimitPercent(withBattery);
  const limitLabel = dcAcLimitLabel(withBattery);
  const inverterMaxPanels = Math.floor((inverter.kw * (withBattery ? DCAC_LIMIT_WITH_BATTERY : DCAC_LIMIT)) / PANEL_KW);
  const maxPanels = Math.min(p.roofMax, inverterMaxPanels);

  const sim = useMemo(() => {
    const consumption = yearlyConsumption(bill, days, rate);
    const gen = generation(arrayKw, age);
    const r = simulate({ battery, consumption, generation: gen, mode, age });
    const rec = recommendedBattery(consumption, gen, mode, age);
    const curve = importCurve(consumption, gen, mode, age);
    return { consumption, gen, r, rec, curve };
  }, [bill, days, rate, arrayKw, age, battery, mode]);

  const { consumption, gen, r, rec, curve } = sim;
  const gridFree = consumption > 0 ? Math.max(0, Math.round((1 - r.imported / consumption) * 100)) : 0;
  const exportIncome = r.exported * fit + r.peakIncome;
  const avoided = r.selfUsed * rate;
  const yearly = exportIncome + avoided;

  const f = PERIOD_DAYS[period] / 365;
  const supplyC = 1.1 * 365 * f;
  const gridC = r.imported * rate * f;
  const expC = exportIncome * f;
  const billCost = supplyC + gridC - expC;

  const pricing = priceSystem({ arrayKw, panels, battery, tier, ratioPercent: ratio, limitPercent: limitPct });
  const payback = yearly > 0 ? pricing.total / yearly : 0;
  const save25 = lifetimeSavings(yearly) - pricing.total;

  const blocked = ratio > limitPct || panels > p.roofMax;
  const stepName = step === 9 ? finalStepName(role) : STEP_NAMES[step - 1];

  const set = (fn: () => void) => {
    fn();
    setDone("");
  };

  /* ---------------- shared bits ---------------- */

  const rolePill = dist
    ? { label: "EasyLink Operations", bg: "#7EC8F7", fg: "#0B2540" }
    : role === "customer"
      ? { label: "Customer portal · signed in", bg: "#FFE7C2", fg: SUN_INK }
      : role === "installer"
        ? { label: "Installer · Solarman", bg: "#DBEAFE", fg: "#1E40AF" }
        : { label: "Website · easylinksolar.com.au/designs", bg: SUNLIGHT, fg: SUN_INK };

  const pillBtn = (on: boolean) => ({
    background: on ? NAVY : WHITE,
    color: on ? WHITE : "#334155",
    border: `1px solid ${on ? NAVY : "#CBD5E1"}`,
  });

  /* ---------------- step 6 derived ---------------- */

  const statCards = [
    { l: "Grid-free", v: `${gridFree}%`, s: "Of your yearly usage" },
    {
      l: "Export income",
      v: money(exportIncome),
      s: `A year · ${mode === "export" ? "incl. evening peak exports" : `at ${Math.round(fit * 100)}c/kWh`}`,
    },
    { l: "Avoided cost", v: money(avoided), s: "A year · power you no longer buy" },
  ];

  const valueCards = [
    {
      l: "House consumption",
      d: `${Math.round(consumption * f).toLocaleString("en-AU")} kWh`,
      k: `Worth ${money(consumption * rate * f)} at your rate`,
      c: INK,
      br: [] as [string, string][],
    },
    {
      l: "Export to grid",
      d: `${Math.round(r.exported * f).toLocaleString("en-AU")} kWh`,
      k: `Earns ${money(expC)}`,
      c: INK,
      br: [] as [string, string][],
    },
    {
      l: "Electricity bill cost",
      d: billCost < 0 ? `${money(-billCost)} credit` : money(billCost),
      k: `With solar${battery > 0 ? " and battery" : ""}`,
      c: billCost < 0 ? GREEN : INK,
      br: [
        ["Supply charge", money(supplyC)],
        ["Grid usage", money(gridC)],
        ["Export credit", `−${money(expC)}`],
      ] as [string, string][],
    },
    {
      l: "Solar net profit / loss",
      d: `${-billCost >= 0 ? "+" : ""}${money(-billCost)}`,
      k: -billCost >= 0 ? "Profit: $0 grid bills reached" : "Still paying the grid",
      c: -billCost >= 0 ? GREEN : "#92400E",
      br: [
        ["Export income", money(expC)],
        ["Grid usage", `−${money(gridC)}`],
        ["Supply charge", `−${money(supplyC)}`],
      ] as [string, string][],
    },
  ];

  const maxLoad = Math.max(...r.monthlyLoad, 1);
  const months = r.monthlyLoad.map((load, i) => {
    const g = Math.max(0, r.monthlyImport[i]);
    const s = Math.max(0, load - g);
    return {
      l: MONTH_INITIAL[i],
      m: MONTH_NAME[i],
      sol: Math.round(s),
      grid: Math.round(g),
      hs: Math.round((s / maxLoad) * 124),
      hg: Math.round((g / maxLoad) * 124),
    };
  });

  const maxImport = Math.max(...curve, 1);
  const nearest = BATTERY_SIZES.reduce((a, k) => (Math.abs(k - battery) < Math.abs(a - battery) ? k : a), 0);
  const curveBars = BATTERY_SIZES.map((k, i) => ({
    k,
    imp: Math.round(curve[i]).toLocaleString("en-AU"),
    h: Math.max(3, Math.round((curve[i] / maxImport) * 124)),
    col: k === nearest ? NAVY : k === rec ? SUN : "#93C5FD",
  }));

  /* ---------------- step 7 checks ---------------- */

  const ok = (t: string, dd: string) => ({ t, d: dd, m: "✓", bg: "#F0FDF4", fg: GREEN });
  const bad = (t: string, dd: string) => ({ t, d: dd, m: "!", bg: "#FEF2F2", fg: "#991B1B" });
  const warn = (t: string, dd: string) => ({ t, d: dd, m: "!", bg: "#FFFBEB", fg: "#92400E" });

  const checks = [
    ratio <= limitPct
      ? ok(`Panel : inverter ${ratio}%`, `Within the ${limitLabel}`)
      : bad(
          `Panel : inverter ${ratio}%`,
          `Over the ${limitLabel} · use ${inverterMaxPanels} panels${
            withBattery ? "" : ", add a battery (200%)"
          } or a larger inverter`,
        ),
    panels <= p.roofMax
      ? ok("Fits the roof", `${panels} of ${p.roofMax} possible panels`)
      : bad("Doesn’t fit the roof", `Roof fits ${p.roofMax} panels`),
    ok("Single-phase limit", `${inverter.kw} kW inverter · ${p.network} allows up to 10 kVA`),
    battery > 0 && !inverter.hybrid
      ? warn("Battery needs a hybrid inverter", "Pick the FOXESS hybrid or add an AC-coupled battery inverter")
      : ok("Battery compatible", battery > 0 ? "Hybrid inverter supports it" : "No battery selected"),
    battery <= 50
      ? ok(
          "Battery rebate",
          battery > 0 ? `Whole ${battery} kWh earns STCs (Cheaper Home Batteries)` : "No battery selected",
        )
      : warn(
          "Battery rebate on the first 50 kWh",
          `${battery} kWh is allowed for a home (up to 100 kWh); STCs cover 50 kWh${battery > rec * 1.5 ? ` · recommended size is ${rec} kWh` : ""}`,
        ),
    ok("CEC approved products", "Panels, inverter and battery are on the approved list"),
  ];

  /* ---------------- step 8 ---------------- */

  const priceLines: [string, string][] = [
    [`Solar · ${kwdc} kW installed`, money(pricing.solarGross)],
    [`Battery · ${battery} kWh installed`, money(pricing.batteryGross)],
    [`Solar STC discount · ${pricing.solarStcs} STCs`, `−${money(pricing.solarStcs * STC_PRICE)}`],
    [
      `Battery STC discount · ${pricing.batteryStcs} STCs${battery > 50 ? " (first 50 kWh)" : ""}`,
      `−${money(pricing.batteryStcs * STC_PRICE)}`,
    ],
  ];
  if (ev || heatPump) {
    priceLines.push([
      `${ev ? "EV charger" : ""}${ev && heatPump ? " and " : ""}${heatPump ? "heat pump" : ""} · quoted by your installer`,
      "$[price]",
    ]);
  }

  const curMonth = (bill * 30.44) / days;
  const newMonth = curMonth - yearly / 12;

  const details: [string, string, string][] = [
    [
      "Panels",
      `${panels} × ${tier === "prem" ? "AXITEC AC-440TGB/108BBA" : `${TIERS[tier].n} 440 W [model]`}`,
      tier === "prem" ? "PNL-AX440" : "add to price list",
    ],
    ["Inverter", inverter.name, inverter.sku],
    [
      "Battery",
      battery > 0
        ? BATTERIES[batterySel] && BATTERIES[batterySel].kwh === battery
          ? BATTERIES[batterySel].name
          : `${battery} kWh · pick a model`
        : "None",
      battery > 0 && BATTERIES[batterySel] ? BATTERIES[batterySel].sku : "",
    ],
  ];
  if (ev) details.push(["EV charger", "myenergi zappi v2 · 7 kW", "EVC-ZAP7"]);
  if (heatPump) details.push(["Heat pump", "Reclaim Energy Gen3 · 270 L", "HWP-RC270"]);
  details.push(
    ["Annual output", `≈ ${Math.round(gen).toLocaleString("en-AU")} kWh`, ""],
    ["CO₂ offset", `≈ ${((gen * 0.66) / 1000).toFixed(1)} t a year`, ""],
    ["Network", `${p.network} · single phase · STC zone 3`, ""],
  );

  /* ---------------- step 5 roof ---------------- */

  const panelsShown = Math.min(panels, p.roofMax);
  // Panels fill the faces in order, so each face takes what is left after the
  // ones before it. Threaded through the fold rather than a mutable counter.
  const faces = p.faces.map((fc, i) => {
    const before = p.faces.slice(0, i).reduce((a, f) => a + f.max, 0);
    const used = Math.max(0, Math.min(panelsShown - before, fc.max));
    return {
      n: fc.n,
      cols: fc.cols,
      bg: view === "rgb" ? "transparent" : "rgba(11,26,46,0.35)",
      label: view === "panels" ? `${used} of ${fc.max} panels` : `${fc.max} panels fit`,
      tiles: Array.from({ length: fc.max }, (_, i) => ({
        c: view === "rgb" ? "transparent" : view === "panels" && i < used ? BLUE : "rgba(255,255,255,0.08)",
        bd: view === "rgb" ? "transparent" : view === "edit" ? SUNLIGHT : NAVY,
      })),
    };
  });

  /* ---------------- step 9 ---------------- */

  const actions: [string, string, boolean][] =
    role === "customer"
      ? [
          ["Save as one of my design options", "Saved. It’s now an option on your Home page and Solarman can see it.", true],
          ["Ask Solarman to check it", "Sent to Solarman in Messages.", false],
          ["Download proposal PDF", "PDF ready in My project › Documents.", false],
        ]
      : dist
        ? [
            ["Save to Design projects", `Saved to Design projects for ${p.title}.`, true],
            ["Send proposal to Raj", "Proposal emailed. Raj gets a portal invite at the first appointment.", false],
            ["Generate SLD", "SLD Rev A created in the SLD editor.", false],
            ["Reserve kit against these SKUs", "Kit reserved. It becomes an order when the deposit is paid.", false],
          ]
        : [
            ["Share to Daniel’s portal as an option", "Shared. Daniel sees it on his Home page.", true],
            ["Create proposal", "Proposal drafted from this design.", false],
            ["Generate bill of materials", "BOM added to the project workflow.", false],
            ["Generate SLD", "SLD Rev A created.", false],
          ];

  const nextPoints = pub
    ? [
        "Your design and proposal are saved to your customer portal.",
        "An SAA-accredited installer near you reviews the roof and confirms the price.",
        "Track every step, from site visit to switch-on, in one place.",
      ]
    : role === "customer"
      ? [
          "Appears with your other design options on Home.",
          "Solarman gets a note to review it.",
          "Pick it as your selected design whenever you’re ready.",
        ]
      : dist
        ? [
            "Same SKUs as Pricing & stock, so the kit order is one click.",
            "Assign the job and the design travels with it to the installer.",
            "Raj gets portal access at the first appointment.",
          ]
        : [
            "Shows on Daniel’s Home page next to his other options.",
            "SKUs flow into the BOM, proposal and SLD.",
            "Order kit from your distributor at trade price.",
          ];

  /* ================= render ================= */

  return (
    <div
      className="flex min-h-full w-full flex-col gap-[18px] px-7 pb-7 pt-[18px] text-white"
      style={{
        backgroundColor: NAVY,
        backgroundImage:
          "linear-gradient(rgba(126,200,247,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(126,200,247,0.07) 1px, transparent 1px)",
        backgroundSize: "36px 36px",
      }}
    >
      {/* step header */}
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="rounded-full px-2.5 py-[3px] text-[11px] font-bold"
          style={{ background: rolePill.bg, color: rolePill.fg }}
        >
          {rolePill.label}
        </span>
        <span className="flex-grow text-[13px]" style={{ color: NAV_TEXT }}>
          Step {step} of 9 · <strong className="text-white">{stepName}</strong>
          {pub ? "" : ` · for ${p.title}`}
        </span>
        <label htmlFor="lang" className="absolute left-[-9999px]">
          Language
        </label>
        <select
          id="lang"
          defaultValue="EN"
          className="h-9 rounded-full px-3 text-[13px] font-semibold text-white"
          style={{ background: NAVY_2, border: `1px solid ${NAVY_LINE}` }}
        >
          <option value="EN">EN · English</option>
          <option>中文</option>
          <option>Tiếng Việt</option>
          <option>العربية</option>
          <option>हिन्दी</option>
          <option>Ελληνικά</option>
        </select>
        <button
          type="button"
          aria-label="Help"
          title="Not built yet"
          className="h-9 w-9 cursor-help rounded-full text-[14px] font-bold"
          style={{ background: NAVY_2, border: `1px solid ${NAVY_LINE}`, color: SUNLIGHT }}
        >
          ?
        </button>
      </div>

      <div
        role="progressbar"
        aria-label="Designer progress"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={9}
        className="h-1.5 overflow-hidden rounded-full"
        style={{ background: NAVY_3 }}
      >
        <span className="block h-full" style={{ width: `${Math.round((step / 9) * 100)}%`, background: SUN_GRAD }} />
      </div>

      {/* 1 · Welcome */}
      {step === 1 && (
        <div className="flex flex-wrap items-center gap-7 py-6">
          <div className="flex flex-[1_1_420px] flex-col gap-4">
            <span
              className="self-start rounded-full px-3 py-[5px] text-[12px] font-bold tracking-[0.08em]"
              style={{ background: "rgba(255,232,102,0.14)", color: SUNLIGHT }}
            >
              SEE YOUR SAVINGS IN ABOUT 3 MINUTES
            </span>
            <h1 className="m-0 font-source-sans text-[48px] font-bold leading-[1.05]">
              Let&rsquo;s design your <span style={{ color: SUNLIGHT }}>solar and battery</span> system
            </h1>
            <p className="m-0 max-w-[520px] text-[17px] leading-[1.5]" style={{ color: NAV_TEXT }}>
              Our AI finds your roof from satellite imagery, sizes the system to your power bill, and shows what
              you&rsquo;d save before anyone visits.
            </p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[14px]" style={{ color: "#E2E8F0" }}>
              {[
                "Roof found automatically from satellite imagery",
                "Sized to your bill, not your whole roof",
                "Rebates (STCs) and payback worked out for you",
              ].map((w) => (
                <li key={w} className="flex items-center gap-2.5">
                  <Icon d={TICK} />
                  {w}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => set(() => setStep(2))}
              className="h-[54px] cursor-pointer self-start rounded-[14px] border-0 px-8 text-[16px] font-bold tracking-[0.04em]"
              style={{ background: SUN_GRAD, color: SUN_INK }}
            >
              SEE YOUR SAVINGS
            </button>
          </div>
          <div
            role="img"
            aria-label="Roof with solar panels"
            className="relative flex min-h-[340px] flex-[1_1_380px] items-center justify-center overflow-hidden rounded-[20px]"
            style={{ background: `linear-gradient(160deg, #1E3A5F, #0F2440)`, border: `1px solid ${NAVY_LINE}` }}
          >
            <svg width="360" height="260" viewBox="0 0 360 260" aria-hidden="true">
              <circle cx="300" cy="50" r="30" fill={SUNLIGHT} opacity="0.9" />
              <path d="M30 150 L180 60 L330 150 Z" fill="#7A3E1D" />
              <rect x="60" y="150" width="240" height="90" fill={NAV_TEXT} />
              <rect x="155" y="185" width="50" height="55" fill={SLATE} />
              <g fill={BLUE} stroke={NAVY} strokeWidth="2">
                <path d="M90 128 L125 107 L150 122 L115 143 Z" />
                <path d="M130 104 L165 83 L190 98 L155 119 Z" />
                <path d="M160 125 L195 104 L220 119 L185 140 Z" />
                <path d="M200 101 L235 80 L260 95 L225 116 Z" />
              </g>
            </svg>
            <span className="absolute bottom-4 left-[18px] text-[13px] font-semibold" style={{ color: SUNLIGHT }}>
              Powering Australian homes with clean energy
            </span>
          </div>
        </div>
      )}

      {/* 2 · Property type */}
      {step === 2 && (
        <div className="flex flex-col items-center gap-[18px] py-2 text-center">
          <h1 className="m-0 font-source-sans text-[36px] font-bold">What type of property is it?</h1>
          <p className="m-0 text-[15px]" style={{ color: NAV_TEXT }}>
            This sets the roof rules, network limits and who designs it.
          </p>
          <div
            role="radiogroup"
            aria-label="Property type"
            className="grid w-full max-w-[960px] gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}
          >
            {PROPERTY_TYPES.map(([k, n, s, path]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={propType === k}
                onClick={() => set(() => setPropType(k))}
                className="flex cursor-pointer flex-col overflow-hidden rounded-[18px] bg-white p-0 text-left text-[#0F172A]"
                style={{ border: `3px solid ${propType === k ? SUN : "transparent"}` }}
              >
                <span
                  className="flex h-[150px] items-center justify-center"
                  style={{ background: `linear-gradient(160deg, #1E3A5F, ${NAVY_2})` }}
                >
                  <Icon d={path} size={96} width={1.4} />
                </span>
                <span className="flex flex-col gap-1 px-4 py-3.5">
                  <strong className="text-[18px]">{n}</strong>
                  <span className="text-[13px]" style={{ color: SLATE }}>
                    {s}
                  </span>
                </span>
              </button>
            ))}
          </div>
          {PROPERTY_NOTES[propType] ? (
            <p
              role="status"
              className="m-0 max-w-[760px] rounded-[12px] px-3.5 py-3 text-[13px] font-semibold"
              style={{ background: "rgba(255,232,102,0.12)", color: SUNLIGHT }}
            >
              {PROPERTY_NOTES[propType]}
            </p>
          ) : null}
        </div>
      )}

      {/* 3 · Contact */}
      {step === 3 && (
        <div className="flex flex-wrap items-start justify-center gap-5">
          <section
            aria-label="Contact details"
            className="flex max-w-[560px] flex-[1_1_420px] flex-col gap-3.5 rounded-[18px] bg-white p-[22px] text-[#0F172A]"
          >
            <h1 className="m-0 font-source-sans text-[30px] font-bold">
              {pub
                ? "Where should we send your design?"
                : role === "customer"
                  ? "Your contact details"
                  : "Who is this design for?"}
            </h1>
            {role === "installer" || dist ? (
              <div className="flex flex-col gap-1">
                <label htmlFor="crm" className={LABEL}>
                  {dist ? "Lead from Quotes & Leads" : "Customer from your CRM"}
                </label>
                <select id="crm" className={FIELD}>
                  <option>{p.title}</option>
                  <option>New customer…</option>
                </select>
              </div>
            ) : null}
            <div className="flex flex-col gap-1">
              <label htmlFor="nm" className={LABEL}>
                Full name
              </label>
              <input
                id="nm"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Nguyen"
                className={FIELD}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="em" className={LABEL}>
                Email
              </label>
              <input
                id="em"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={FIELD}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="ph" className={LABEL}>
                Mobile
              </label>
              <div className="flex gap-2">
                <span
                  className="flex h-12 items-center rounded-[12px] px-3 text-[15px] font-semibold"
                  style={{ border: "1px solid #CBD5E1", background: "#F8FAFC" }}
                >
                  AU +61
                </span>
                <input
                  id="ph"
                  type="tel"
                  autoComplete="tel-national"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="4XX XXX XXX"
                  className={`${FIELD} min-w-0 flex-1`}
                />
              </div>
            </div>
            <label className="flex min-h-11 items-start gap-2.5 text-[13px]" style={{ color: "#334155" }}>
              <input
                type="checkbox"
                checked={sms}
                onChange={() => setSms(!sms)}
                className="mt-px h-5 w-5 accent-[#F68A0A]"
              />
              <span>Text me about my design and installation. Reply STOP to opt out at any time.</span>
            </label>
            <span className="text-[12px]" style={{ color: "#5B6B80" }}>
              {pub
                ? "We use these details for your design and proposal only. See our privacy policy."
                : role === "customer"
                  ? "From your profile. Changes here update My profile."
                  : dist
                    ? "Filled from the lead. Changes sync back to Quotes & Leads."
                    : "Filled from Customers. Changes sync back to Daniel’s record."}
            </span>
          </section>
          <aside
            aria-label="Why we ask"
            className="flex max-w-[380px] flex-[1_1_280px] flex-col gap-2.5 rounded-[18px] p-5"
            style={{ background: SUN_GRAD_135, color: SUN_INK }}
          >
            <strong className="text-[18px]">Why we ask</strong>
            {(pub
              ? [
                  "We email your design and proposal so you can come back to it.",
                  "An accredited installer near you can check the roof and confirm the price.",
                  "We never sell your details. No calls on Sundays or public holidays.",
                ]
              : [
                  "Contact details stay with the customer record in every portal.",
                  "The proposal and portal invite go to this email.",
                  "SMS only with consent. Reply STOP opts out across EasyLink.",
                ]
            ).map((w) => (
              <span key={w} className="flex gap-2 text-[14px] leading-[1.45]">
                <Icon d={TICK} stroke={SUN_INK} />
                {w}
              </span>
            ))}
          </aside>
        </div>
      )}

      {/* 4 · Address */}
      {step === 4 && (
        <div className="flex flex-col gap-3.5">
          <h1 className="m-0 text-center font-source-sans text-[34px] font-bold">Where is the property?</h1>
          <div className="mx-auto flex w-full max-w-[760px] gap-2">
            <label htmlFor="addr" className="absolute left-[-9999px]">
              Property address
            </label>
            <input
              id="addr"
              defaultValue={p.address}
              autoComplete="street-address"
              className="h-[52px] min-w-0 flex-1 rounded-[14px] px-4 text-[16px] text-[#0F172A]"
              style={{ border: `2px solid ${SUNLIGHT}` }}
            />
            <button
              type="button"
              onClick={() => set(() => setStep(5))}
              className="h-[52px] cursor-pointer rounded-[14px] border-0 px-5 text-[15px] font-bold"
              style={{ background: SUN_GRAD, color: SUN_INK }}
            >
              Find my roof
            </button>
          </div>
          <div
            role="img"
            aria-label="Satellite map centred on the property with a pin"
            className="relative flex h-[520px] items-center justify-center overflow-hidden rounded-[18px]"
            style={{
              border: `1px solid ${NAVY_LINE}`,
              backgroundColor: "#3D4A3A",
              backgroundImage:
                "linear-gradient(90deg, rgba(0,0,0,0.18) 2px, transparent 2px), linear-gradient(rgba(0,0,0,0.18) 2px, transparent 2px), radial-gradient(circle at 30% 40%, #56634F 0, transparent 30%), radial-gradient(circle at 70% 65%, #4B5845 0, transparent 26%)",
              backgroundSize: "120px 90px, 120px 90px, 100% 100%, 100% 100%",
            }}
          >
            <span
              style={{
                width: 90 + (zoom - 18) * 50,
                height: 60 + (zoom - 18) * 34,
                background: "#8A4B2A",
                border: "2px solid #5C2E16",
                borderRadius: 4,
                boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
              }}
            />
            <div className="absolute right-3.5 top-3.5 flex flex-col gap-1.5">
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => setZoom(Math.min(21, zoom + 1))}
                className="h-10 w-10 cursor-pointer rounded-[10px] border-0 bg-white text-[20px] font-bold text-[#0F172A]"
              >
                +
              </button>
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => setZoom(Math.max(18, zoom - 1))}
                className="h-10 w-10 cursor-pointer rounded-[10px] border-0 bg-white text-[20px] font-bold text-[#0F172A]"
              >
                &minus;
              </button>
            </div>
            <span
              className="absolute bottom-3 left-3.5 rounded-md px-2 py-[3px] text-[11px]"
              style={{ color: "#E2E8F0", background: "rgba(11,26,46,0.7)" }}
            >
              Satellite imagery · zoom {zoom}
            </span>
          </div>
          <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            {[
              ["Network", p.network],
              ["Supply", "Single phase · up to 10 kVA inverter"],
              ["STC zone", "Zone 3 · rating 1.382"],
              ["Roof data", "Satellite + building outline"],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex flex-col gap-0.5 rounded-[12px] px-3.5 py-3"
                style={{ background: NAVY_2, border: `1px solid ${NAVY_LINE}` }}
              >
                <span className="text-[12px]" style={{ color: "#9FB0C8" }}>
                  {k}
                </span>
                <strong className="text-[15px]">{v}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5 · AI roof */}
      {step === 5 && (
        <div className="flex flex-col gap-3.5">
          <h1 className="m-0 text-center font-source-sans text-[34px] font-bold">Our AI has found your roof</h1>
          <p className="m-0 text-center text-[13px]" style={{ color: NAV_TEXT }}>
            Measured from aerial imagery and sized to your bill by our design AI. Prices and rebates come from our
            pricing system. Complex or steep roofs are checked by a designer before you get a quote.{" "}
            <span title="Not built yet" className="cursor-help" style={{ color: SUNLIGHT }}>
              How we use AI
            </span>
          </p>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            {[
              ["Total roof area", `${p.total} m²`, "From the building outline"],
              ["Usable roof area", `${p.usable} m²`, "After edges, vents and shade"],
              ["Panels that can fit", String(p.roofMax), "440 W panels · the most, not the target"],
            ].map(([l, v, s]) => (
              <div
                key={l}
                className="flex flex-col gap-0.5 rounded-[14px] px-4 py-3.5"
                style={{ background: SUN_GRAD_135, color: SUN_INK }}
              >
                <span className="text-[13px] font-bold">{l}</span>
                <strong className="font-source-sans text-[32px]">{v}</strong>
                <span className="text-[12px]">{s}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Map view" className="flex gap-1 rounded-[12px] p-1" style={{ background: NAVY_2 }}>
              {(["rgb", "panels", "edit"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={view === k}
                  onClick={() => setView(k)}
                  className="h-[38px] cursor-pointer rounded-[9px] border-0 px-4 text-[13px] font-bold"
                  style={{
                    background: view === k ? SUNLIGHT : "transparent",
                    color: view === k ? SUN_INK : WHITE,
                  }}
                >
                  {k === "rgb" ? "RGB" : k === "panels" ? "Panels" : "Edit"}
                </button>
              ))}
            </div>
            <span className="flex-grow" />
            <button
              type="button"
              title="Not built yet"
              className="h-10 cursor-help rounded-[10px] bg-transparent px-3.5 text-[13px] font-semibold text-white"
              style={{ border: `1px solid ${NAVY_LINE}` }}
            >
              + Add roof
            </button>
            <button
              type="button"
              onClick={() => setView("edit")}
              className="h-10 cursor-pointer rounded-[10px] bg-transparent px-3.5 text-[13px] font-semibold text-white"
              style={{ border: `1px solid ${NAVY_LINE}` }}
            >
              Edit roof
            </button>
          </div>
          <div
            role="img"
            aria-label={`Roof outline with ${view === "panels" ? `${panelsShown} panels placed` : `${p.roofMax} possible panel spots`}`}
            className="flex min-h-[420px] items-center justify-center rounded-[18px] p-6"
            style={{
              border: `1px solid ${NAVY_LINE}`,
              backgroundColor: "#3D4A3A",
              backgroundImage:
                "linear-gradient(90deg, rgba(0,0,0,0.18) 2px, transparent 2px), linear-gradient(rgba(0,0,0,0.18) 2px, transparent 2px)",
              backgroundSize: "120px 90px",
            }}
          >
            <div
              className="flex flex-wrap gap-1 rounded-md p-2.5"
              style={{ border: `3px ${view === "edit" ? "dashed" : "solid"} #FF4848`, background: "#8A4B2A" }}
            >
              {faces.map((fc) => (
                <div key={fc.n} className="flex flex-col items-center gap-1.5 rounded p-2" style={{ background: fc.bg }}>
                  <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${fc.cols}, 22px)` }}>
                    {fc.tiles.map((t, i) => (
                      <span
                        key={i}
                        className="h-[34px] w-[22px] rounded-[2px]"
                        style={{ background: t.c, border: `1px solid ${t.bd}` }}
                      />
                    ))}
                  </div>
                  <span className="text-[12px] font-semibold text-white">
                    {fc.n} · {fc.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="m-0 rounded-[12px] px-3.5 py-3 text-[13px]" style={{ background: NAVY_2, color: NAV_TEXT }}>
            Showing {panelsShown} panels: sized to your usage and a {inverter.kw} kW inverter (max {maxPanels} within
            the {limitLabel}). The roof could fit {p.roofMax}, but more panels than the inverter is allowed would not
            earn STCs.
          </p>
        </div>
      )}

      {/* 6 · Savings */}
      {step === 6 && (
        <div className="flex flex-wrap items-start gap-4">
          <section
            aria-label="Your usage"
            className="flex max-w-[400px] flex-[1_1_320px] flex-col gap-2.5 rounded-[18px] p-[18px]"
            style={{ background: SUN_GRAD_135, color: SUN_INK }}
          >
            <h1 className="m-0 font-source-sans text-[26px] font-bold">Design your path to $0 grid bills</h1>
            <span className="text-[12px] font-bold uppercase tracking-[0.04em]">Your energy bill</span>
            <div className="flex gap-2">
              <label htmlFor="bill" className="absolute left-[-9999px]">
                Bill amount in dollars
              </label>
              <input
                id="bill"
                type="number"
                value={bill}
                onChange={(e) => setBill(Number(e.target.value) || 0)}
                className="h-[46px] min-w-0 flex-1 rounded-[10px] border-0 px-3 font-source-sans text-[18px] font-bold text-[#0F172A]"
              />
              <label htmlFor="per" className="absolute left-[-9999px]">
                Bill period
              </label>
              <select
                id="per"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="h-[46px] rounded-[10px] border-0 bg-white px-2.5 text-[14px] text-[#0F172A]"
              >
                <option value={91}>Quarterly</option>
                <option value={30}>Monthly</option>
                <option value={365}>Yearly</option>
              </select>
            </div>
            <input
              type="range"
              aria-label="Bill amount slider"
              min={200}
              max={4000}
              step={50}
              value={bill}
              onChange={(e) => setBill(Number(e.target.value))}
              className="accent-[#0B1A2E]"
            />
            <div className="flex gap-2 text-[12px]">
              <label htmlFor="rate" className="flex min-w-0 flex-1 flex-col gap-0.5">
                Usage rate $/kWh
                <input
                  id="rate"
                  type="number"
                  step={0.01}
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value) || 0.37)}
                  className="h-[38px] w-full rounded-lg border-0 px-2 text-[#0F172A]"
                />
              </label>
              <label htmlFor="fit" className="flex min-w-0 flex-1 flex-col gap-0.5">
                Feed-in $/kWh
                <input
                  id="fit"
                  type="number"
                  step={0.01}
                  value={fit}
                  onChange={(e) => setFit(Number(e.target.value) || 0)}
                  className="h-[38px] w-full rounded-lg border-0 px-2 text-[#0F172A]"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-lg px-2.5 py-[5px] text-[12px] font-bold" style={{ background: NAVY, color: SUNLIGHT }}>
                {panels} panels · {kwdc} kW
              </span>
              <span className="rounded-lg px-2.5 py-[5px] text-[12px] font-bold" style={{ background: NAVY, color: SUNLIGHT }}>
                {inverter.kw} kW inverter · {ratio}%
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="flex-grow text-[12px] font-bold uppercase tracking-[0.04em]">Battery capacity</span>
              {Math.abs(battery - rec) < 0.5 ? (
                <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: NAVY, color: SUNLIGHT }}>
                  Recommended
                </span>
              ) : null}
            </div>
            <label htmlFor="batt" className="flex justify-between text-[14px] font-bold">
              Capacity <span>{battery} kWh</span>
            </label>
            <input
              id="batt"
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(battery)}
              onChange={(e) => {
                setBattery(Number(e.target.value));
                setBatterySel("custom");
              }}
              className="accent-[#0B1A2E]"
            />
            <span className="text-[12px]">
              Recommended for this home: <strong>{rec} kWh</strong>. Home batteries go up to 100 kWh; the rebate covers
              the first 50 kWh.
            </span>
            <div role="group" aria-label="Battery mode" className="flex gap-1.5">
              {(
                [
                  ["self", "Self-consumption"],
                  ["export", "Export-optimised"],
                ] as [BatteryMode, string][]
              ).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={mode === k}
                  onClick={() => setMode(k)}
                  className="h-10 flex-1 cursor-pointer rounded-[9px] border-0 text-[12px] font-bold"
                  style={{
                    background: mode === k ? NAVY : "rgba(255,255,255,0.55)",
                    color: mode === k ? SUNLIGHT : SUN_INK,
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
            <span className="text-[12px]">
              {mode === "self"
                ? "The battery covers your evening use; spare solar exports at the feed-in rate."
                : "Holds some charge back and sells it in the 4–7 pm peak, after your home is covered."}
            </span>
            <label htmlFor="age" className="flex justify-between text-[13px] font-bold">
              System age <span>{age === 0 ? "New" : `Year ${age}`}</span>
            </label>
            <input
              id="age"
              type="range"
              min={0}
              max={25}
              step={1}
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="accent-[#0B1A2E]"
            />
            <span className="text-[11px] leading-[1.4]">
              Estimates use your bill, typical Sydney sun and a standard usage shape. Your installer confirms them with
              interval data from your retailer.
            </span>
          </section>

          <div className="flex min-w-0 flex-[2_1_520px] flex-col gap-3">
            <section aria-label="System performance" className={CARD_W}>
              <h2 className="m-0 text-[15px] font-bold">System performance</h2>
              <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
                {statCards.map((s) => (
                  <div key={s.l} className="flex flex-col gap-0.5 rounded-[12px] bg-[#F4F6FA] p-3">
                    <span className="text-[12px] font-semibold" style={{ color: SLATE }}>
                      {s.l}
                    </span>
                    <strong className="font-source-sans text-[28px]">{s.v}</strong>
                    <span className="text-[11px]" style={{ color: "#5B6B80" }}>
                      {s.s}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section aria-label="Consumption and solar value" className={CARD_W}>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="m-0 flex-grow text-[15px] font-bold">Consumption &amp; solar value</h2>
                <div role="group" aria-label="Period" className="flex gap-1">
                  {(["day", "week", "month", "quarter", "year"] as Period[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={period === k}
                      onClick={() => setPeriod(k)}
                      className="h-8 cursor-pointer rounded-full px-2.5 text-[12px] font-semibold"
                      style={pillBtn(period === k)}
                    >
                      {k[0].toUpperCase() + k.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
                {valueCards.map((v) => (
                  <div key={v.l} className="flex flex-col gap-1 rounded-[10px] bg-[#F8FAFC] p-2.5">
                    <span className="text-[11px] font-bold" style={{ color: SLATE }}>
                      {v.l}
                    </span>
                    <strong className="text-[19px]" style={{ color: v.c }}>
                      {v.d}
                    </strong>
                    <span className="text-[12px]" style={{ color: "#334155" }}>
                      {v.k}
                    </span>
                    {v.br.map(([bl, bv]) => (
                      <span
                        key={bl}
                        className="flex justify-between gap-1.5 pt-[3px] text-[11px]"
                        style={{ color: "#5B6B80", borderTop: "1px dashed #E2E8F0" }}
                      >
                        <span>{bl}</span>
                        <span className="font-semibold" style={{ color: "#334155" }}>
                          {bv}
                        </span>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </section>

            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
              <section aria-label="Grid import vs battery size" className={`${CARD_W} gap-2`}>
                <h2 className="m-0 text-[15px] font-bold">Grid import vs battery size</h2>
                <div
                  role="img"
                  aria-label={`Grid import by battery size: ${curveBars.map((c) => `${c.k} kWh ${c.imp}`).join(", ")}`}
                  className="flex h-[130px] items-end gap-1"
                  style={{ borderBottom: "1px solid #CBD5E1" }}
                >
                  {curveBars.map((c) => (
                    <div
                      key={c.k}
                      title={`${c.k} kWh battery: ${c.imp} kWh from the grid a year`}
                      className="flex h-full flex-1 items-end"
                    >
                      <span className="w-full rounded-t-[3px]" style={{ height: c.h, background: c.col }} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-1">
                  {curveBars.map((c) => (
                    <span key={c.k} className="flex-1 text-center text-[10px]" style={{ color: "#5B6B80" }}>
                      {c.k}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3 text-[11px]" style={{ color: "#334155" }}>
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: SUN }} />
                    Recommended · {rec} kWh
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: NAVY }} />
                    Your choice
                  </span>
                  <span>Battery kWh &rarr;</span>
                </div>
              </section>

              <section aria-label="Monthly usage breakdown" className={`${CARD_W} gap-2`}>
                <h2 className="m-0 text-[15px] font-bold">Monthly usage breakdown</h2>
                <div
                  role="img"
                  aria-label={`Monthly usage, from solar and from grid: ${months.map((m) => `${m.m} ${m.sol} solar ${m.grid} grid kWh`).join(", ")}`}
                  className="flex h-[130px] items-end gap-1"
                  style={{ borderBottom: "1px solid #CBD5E1" }}
                >
                  {months.map((m) => (
                    <div
                      key={m.m}
                      title={`${m.m}: ${m.sol} kWh from solar, ${m.grid} kWh from grid`}
                      className="flex h-full flex-1 flex-col justify-end gap-px"
                    >
                      <span className="w-full rounded-t-[3px]" style={{ height: m.hg, background: BLUE }} />
                      <span className="w-full" style={{ height: m.hs, background: SUN }} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-1">
                  {months.map((m) => (
                    <span key={m.m} className="flex-1 text-center text-[10px]" style={{ color: "#5B6B80" }}>
                      {m.l}
                    </span>
                  ))}
                </div>
                <div className="flex gap-3 text-[11px]" style={{ color: "#334155" }}>
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: SUN }} />
                    From solar + battery
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: BLUE }} />
                    From grid
                  </span>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* 7 · Equipment */}
      {step === 7 && (
        <div className="flex flex-col gap-3.5">
          <h1 className="m-0 text-center font-source-sans text-[34px] font-bold">Choose your equipment</h1>
          <p className="m-0 text-center text-[14px]" style={{ color: NAV_TEXT }}>
            Every model comes from the EasyLink catalogue, so the same SKUs carry into your proposal, the
            installer&rsquo;s kit and the distributor&rsquo;s order.
          </p>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            {/* Panels */}
            <EquipCard
              kind="Panels"
              icon={ICON.pv}
              tag="Required"
              on
              sku={`PNL-AX440 · ${panels} × 440 W = ${kwdc} kW`}
              btn={`Added · ${panels} panels`}
              brands={["AXITEC"]}
              models={[["ax", "AC-440TGB/108BBA · 440 W"]]}
              qty={
                <div className="flex items-center gap-1.5">
                  <span className="flex-grow text-[13px]">Qty</span>
                  <button
                    type="button"
                    onClick={() => setPanels(Math.max(1, panels - 1))}
                    aria-label="Fewer panels"
                    className="h-10 w-10 cursor-pointer rounded-[10px] bg-white text-[18px]"
                    style={{ border: `2px solid ${BLUE}` }}
                  >
                    &minus;
                  </button>
                  <strong className="min-w-[30px] text-center">{panels}</strong>
                  <button
                    type="button"
                    onClick={() => setPanels(panels + 1)}
                    aria-label="More panels"
                    className="h-10 w-10 cursor-pointer rounded-[10px] bg-white text-[18px]"
                    style={{ border: `2px solid ${BLUE}` }}
                  >
                    +
                  </button>
                </div>
              }
            />
            {/* Inverter */}
            <EquipCard
              kind="Inverter"
              icon={ICON.inv}
              tag="Required"
              on
              sku={inverter.sku}
              btn="Added"
              brands={[...new Set(Object.values(INVERTERS).map((x) => x.brand))]}
              brandValue={inverter.brand}
              onBrand={(v) => {
                const k = Object.keys(INVERTERS).find((x) => INVERTERS[x].brand === v);
                if (k) setInverterKey(k);
              }}
              models={Object.keys(INVERTERS).map((k) => [k, INVERTERS[k].short] as [string, string])}
              modelValue={inverterKey}
              onModel={setInverterKey}
            />
            {/* Battery */}
            <EquipCard
              kind="Battery"
              icon={ICON.bat}
              tag="Optional"
              on={battery > 0}
              sku={battery > 0 ? BATTERIES[batterySel]?.sku ?? "" : `Recommended ${rec} kWh`}
              btn={battery > 0 ? "Added · remove" : "+ Add"}
              onToggle={() => {
                if (battery > 0) {
                  setBattery(0);
                  setBatterySel("none");
                } else {
                  const k = BATTERIES[batterySel] && batterySel !== "none" ? batterySel : "fx4660";
                  setBatterySel(k);
                  setBattery(BATTERIES[k].kwh);
                }
              }}
              brands={["FOX ESS", "Stackable range"]}
              brandValue={BATTERIES[batterySel]?.brand}
              onBrand={(v) => {
                const k = v === "FOX ESS" ? "fx4660" : "b100";
                setBatterySel(k);
                setBattery(BATTERIES[k].kwh);
              }}
              models={["fx4660", "fx2", "b100", "b200", "b500", "b1000"].map(
                (k) => [k, BATTERIES[k].short] as [string, string],
              )}
              modelValue={batterySel}
              onModel={(k) => {
                setBatterySel(k);
                setBattery(BATTERIES[k].kwh);
              }}
            />
            {/* EV charger */}
            <EquipCard
              kind="EV charger"
              icon={ICON.ev}
              tag="Optional"
              on={ev}
              sku="EVC-ZAP7"
              btn={ev ? "Added · remove" : "+ Add"}
              onToggle={() => setEv(!ev)}
              brands={["myenergi"]}
              models={[["z", "zappi v2 · 7 kW"]]}
            />
            {/* Heat pump */}
            <EquipCard
              kind="Heat pump"
              icon={ICON.hp}
              tag="Optional"
              on={heatPump}
              sku="HWP-RC270"
              btn={heatPump ? "Added · remove" : "+ Add"}
              onToggle={() => setHeatPump(!heatPump)}
              brands={["Reclaim Energy"]}
              models={[["r", "Gen3 · 270 L"]]}
            />
          </div>
          <section
            aria-label="Design checks"
            className="grid gap-2 rounded-[16px] p-3.5"
            style={{
              background: NAVY_2,
              border: `1px solid ${NAVY_LINE}`,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            {checks.map((c) => (
              <div key={c.t} className="flex gap-2.5 rounded-[10px] p-2.5" style={{ background: c.bg }}>
                <span aria-hidden="true" className="font-bold" style={{ color: c.fg }}>
                  {c.m}
                </span>
                <span className="flex flex-col gap-0.5">
                  <strong className="text-[13px]" style={{ color: c.fg }}>
                    {c.t}
                  </strong>
                  <span className="text-[12px]" style={{ color: "#334155" }}>
                    {c.d}
                  </span>
                </span>
              </div>
            ))}
          </section>
        </div>
      )}

      {/* 8 · Proposal */}
      {step === 8 && (
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="m-0 flex-grow font-source-sans text-[34px] font-bold">Your solar proposal</h1>
            <span
              className="rounded-full px-3 py-1 text-[12px] font-bold"
              style={
                blocked
                  ? { background: "#FEE2E2", color: "#991B1B" }
                  : { background: "#DCFCE7", color: GREEN }
              }
            >
              {blocked ? "Needs a change before approval" : "Passes all design checks"}
            </span>
          </div>
          <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
            {[
              ["System size", `${kwdc} kW`, `${inverter.kw} kW inverter · ${ratio}%`],
              ["Panels", String(panels), `${TIERS[tier].n} 440 W`],
              ["Yearly savings", money(yearly), "Avoided cost + export income"],
              ["Payback", `${payback.toFixed(1)} yrs`, `On ${money(pricing.total)}`],
            ].map(([l, v, s]) => (
              <div
                key={l}
                className="flex flex-col gap-0.5 rounded-[14px] p-3.5"
                style={{ background: SUN_GRAD_135, color: SUN_INK }}
              >
                <span className="text-[12px] font-bold">{l}</span>
                <strong className="font-source-sans text-[30px]">{v}</strong>
                <span className="text-[12px]">{s}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-start gap-3.5 text-[#0F172A]">
            <div className="flex min-w-0 flex-[3_1_520px] flex-col gap-3.5">
              <section aria-label="Panel tier" className={CARD_W}>
                <h2 className="m-0 text-[15px] font-bold">Panel tier</h2>
                <div role="radiogroup" aria-label="Panel tier" className="grid gap-2" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
                  {Object.entries(TIERS).map(([k, t]) => {
                    const on = k === tier;
                    const delta = t.per * panels;
                    return (
                      <button
                        key={k}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setTier(k)}
                        className="flex cursor-pointer flex-col gap-[3px] rounded-[12px] p-3 text-left"
                        style={{
                          border: `2px solid ${on ? SUN : "#E3E8EF"}`,
                          background: on ? "#FFF7E6" : WHITE,
                        }}
                      >
                        <span className="flex items-center gap-1.5">
                          <strong className="flex-grow text-[14px]">{t.n}</strong>
                          <span className="text-[10px] font-bold" style={{ color: GREEN }}>
                            {t.badge}
                          </span>
                        </span>
                        <span className="text-[12px]" style={{ color: SLATE }}>
                          {t.d}
                        </span>
                        <strong className="text-[13px]">
                          {delta === 0
                            ? "Included"
                            : `${delta > 0 ? "+" : "−"}$${Math.abs(delta).toLocaleString("en-AU")}`}
                        </strong>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section aria-label="Battery options" className={CARD_W}>
                <h2 className="m-0 text-[15px] font-bold">Battery options</h2>
                <div
                  role="radiogroup"
                  aria-label="Battery options"
                  className="grid gap-2"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(112px, 1fr))" }}
                >
                  {["none", "b100", "b200", "fx4660", "b500", "fx2", "b1000"].map((k) => {
                    const b = BATTERIES[k];
                    const on = Math.abs(battery - b.kwh) < 0.01;
                    return (
                      <button
                        key={k}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => {
                          setBatterySel(k);
                          setBattery(b.kwh);
                        }}
                        className="flex cursor-pointer flex-col gap-[3px] rounded-[12px] p-3 text-left"
                        style={{ border: `2px solid ${on ? SUN : "#E3E8EF"}`, background: on ? "#FFF7E6" : WHITE }}
                      >
                        <strong className="text-[14px]">{b.short}</strong>
                        <span className="text-[11px]" style={{ color: SLATE }}>
                          {b.sku}
                        </span>
                        <span className="text-[12px] font-semibold" style={{ color: GREEN }}>
                          {b.kwh > 0 && Math.abs(b.kwh - rec) <= 4 ? "Closest to recommended" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section aria-label="System details" className={`${CARD_W} gap-1.5`}>
                <h2 className="m-0 mb-1 text-[15px] font-bold">System details</h2>
                {details.map(([k, v, sku]) => (
                  <div
                    key={k}
                    className="flex gap-2.5 py-[7px] text-[13px]"
                    style={{ borderBottom: "1px solid #EEF2F6" }}
                  >
                    <span className="flex-[0_0_170px]" style={{ color: "#5B6B80" }}>
                      {k}
                    </span>
                    <strong className="flex-grow">{v}</strong>
                    <code className="text-[11px]" style={{ color: SLATE }}>
                      {sku}
                    </code>
                  </div>
                ))}
              </section>
            </div>

            <div className="flex min-w-0 flex-[2_1_320px] flex-col gap-3.5">
              <section aria-label="Price" className={`${CARD_W} gap-1.5 p-4`}>
                <h2 className="m-0 mb-1 text-[15px] font-bold">Total system price</h2>
                {priceLines.map(([l, v]) => (
                  <div key={l} className="flex justify-between gap-2 text-[13px]" style={{ color: "#334155" }}>
                    <span>{l}</span>
                    <span className="font-semibold tabular-nums">{v}</span>
                  </div>
                ))}
                <div
                  className="mt-1 flex items-baseline justify-between gap-2 pt-2"
                  style={{ borderTop: `2px solid ${INK}` }}
                >
                  <strong className="text-[14px]">Incl. installation &amp; GST</strong>
                  <strong className="font-source-sans text-[30px]">{money(pricing.total)}</strong>
                </div>
                <span className="text-[11px]" style={{ color: "#5B6B80" }}>
                  {role === "customer" || pub
                    ? "Indicative, from the EasyLink price list. Your installer confirms the final price after a site check."
                    : dist
                      ? "Customer price at RRP. Your margin and trade pricing show in Create proposal."
                      : "Customer price at RRP. Your trade cost and margin show in Create proposal."}
                </span>
              </section>

              <section
                aria-label="Savings"
                className="grid gap-2 rounded-[16px] bg-white p-4 text-[#0F172A]"
                style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
              >
                {[
                  ["Monthly savings", money(yearly / 12), GREEN],
                  ["Current bill", `${money(curMonth)}/mo`, INK],
                  [
                    "New bill",
                    newMonth < 0 ? `${money(-newMonth)} credit` : `${money(newMonth)}/mo`,
                    newMonth < 0 ? GREEN : INK,
                  ],
                ].map(([l, v, c]) => (
                  <div key={l} className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-bold" style={{ color: SLATE }}>
                      {l}
                    </span>
                    <strong className="text-[20px]" style={{ color: c }}>
                      {v}
                    </strong>
                  </div>
                ))}
                <div
                  className="flex flex-col gap-0.5 rounded-[12px] p-3"
                  style={{ gridColumn: "1 / -1", background: NAVY, color: WHITE }}
                >
                  <span className="text-[12px]" style={{ color: NAV_TEXT }}>
                    25-year net savings
                  </span>
                  <strong className="font-source-sans text-[30px]" style={{ color: SUNLIGHT }}>
                    {money(save25)}
                  </strong>
                  <span className="text-[11px]" style={{ color: "#9FB0C8" }}>
                    After the system price, with 0.5% panel ageing a year and today&rsquo;s tariffs
                  </span>
                </div>
              </section>

              <button
                type="button"
                onClick={() =>
                  setDone(
                    `Proposal PDF ready · ${kwdc} kW${battery > 0 ? ` + ${battery} kWh` : ""} · ${money(pricing.total)}`,
                  )
                }
                className="h-[50px] cursor-pointer rounded-[12px] bg-transparent text-[15px] font-bold tracking-[0.04em]"
                style={{ border: `2px solid ${SUNLIGHT}`, color: SUNLIGHT }}
              >
                DOWNLOAD YOUR PROPOSAL
              </button>
              {done ? (
                <p
                  role="status"
                  className="m-0 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold"
                  style={{ background: NAVY_2, color: "#7EE2A0" }}
                >
                  {done}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* 9 · Save / share */}
      {step === 9 && (
        <div className="flex flex-wrap items-start justify-center gap-5 py-2">
          {pub ? (
            <section
              aria-label="Account"
              className="flex max-w-[480px] flex-[1_1_420px] flex-col gap-3.5 rounded-[18px] bg-white p-6 text-[#0F172A]"
            >
              <div role="tablist" aria-label="Account" className="flex gap-1 rounded-[12px] bg-[#F1F5F9] p-1">
                {(
                  [
                    ["create", "Create account"],
                    ["signin", "Sign in"],
                  ] as ["create" | "signin", string][]
                ).map(([k, l]) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={auth === k}
                    onClick={() => set(() => setAuth(k))}
                    className="h-10 flex-1 cursor-pointer rounded-[9px] border-0 text-[14px] font-bold"
                    style={{ background: auth === k ? WHITE : "transparent", color: auth === k ? INK : SLATE }}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <h1 className="m-0 font-source-sans text-[28px] font-bold">
                {auth === "create" ? "Create your account" : "Welcome back"}
              </h1>
              <span className="text-[14px]" style={{ color: SLATE }}>
                {auth === "create"
                  ? "Save this design to your own customer portal."
                  : "Sign in to your customer account."}
              </span>
              <div className="flex flex-col gap-1">
                <label htmlFor="aem" className={LABEL}>
                  Email
                </label>
                <input
                  id="aem"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={FIELD}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="apw" className={LABEL}>
                  Password
                </label>
                <input
                  id="apw"
                  type="password"
                  autoComplete={auth === "create" ? "new-password" : "current-password"}
                  className={FIELD}
                />
              </div>
              <div className="flex items-center gap-2 text-[13px]">
                <label className="flex min-h-11 flex-grow items-center gap-2">
                  <input type="checkbox" className="h-5 w-5 accent-[#F68A0A]" />
                  Remember me
                </label>
                <span title="Not built yet" className="cursor-help font-semibold" style={{ color: "#1565C0" }}>
                  Forgot password?
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDone(
                    auth === "create"
                      ? "Account created. Your design is saved under My designs."
                      : "Signed in. Your design is saved under My designs.",
                  )
                }
                className="h-[52px] cursor-pointer rounded-[12px] border-0 text-[16px] font-bold"
                style={{ background: SUN_GRAD, color: SUN_INK }}
              >
                {auth === "create" ? "Create account & save design" : "Sign in & save design"}
              </button>
              {done ? (
                <p
                  role="status"
                  className="m-0 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold"
                  style={{ background: "#F0FDF4", color: GREEN }}
                >
                  {done}
                </p>
              ) : null}
            </section>
          ) : (
            <section
              aria-label="Use this design"
              className="flex max-w-[560px] flex-[1_1_420px] flex-col gap-2.5 rounded-[18px] p-[22px]"
              style={{ background: NAVY_2, border: `1px solid ${NAVY_LINE}` }}
            >
              <h1 className="m-0 font-source-sans text-[28px] font-bold">
                {role === "customer" ? "Save to your portal" : dist ? "Save and send" : "Share with Daniel"}
              </h1>
              <span className="text-[14px]" style={{ color: NAV_TEXT }}>
                {role === "customer"
                  ? "You’re signed in, so the design saves straight to your account."
                  : dist
                    ? "This design stays in Design projects and follows the job to the installer you assign."
                    : "Daniel sees it as an option on his Home page. If he has no portal login yet, we email him an invite."}
              </span>
              {actions.map(([l, msg, primary]) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setDone(msg)}
                  className="min-h-[50px] cursor-pointer rounded-[12px] px-4 text-left text-[15px] font-bold"
                  style={{
                    background: primary ? SUN_GRAD : "transparent",
                    color: primary ? SUN_INK : WHITE,
                    border: primary ? "0" : `1px solid ${NAVY_LINE}`,
                  }}
                >
                  {l}
                </button>
              ))}
              {done ? (
                <p
                  role="status"
                  className="m-0 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold"
                  style={{ background: NAVY, color: "#7EE2A0" }}
                >
                  {done}
                </p>
              ) : null}
            </section>
          )}
          <aside
            aria-label="What happens next"
            className="flex max-w-[380px] flex-[1_1_280px] flex-col gap-2.5 rounded-[18px] p-5"
            style={{ background: SUN_GRAD_135, color: SUN_INK }}
          >
            <strong className="text-[18px]">
              Your design · {kwdc} kW{battery > 0 ? ` + ${battery} kWh` : ""}
            </strong>
            {nextPoints.map((w) => (
              <span key={w} className="flex gap-2 text-[14px] leading-[1.45]">
                <Icon d={TICK} stroke={SUN_INK} />
                {w}
              </span>
            ))}
          </aside>
        </div>
      )}

      {/* footer nav */}
      <div
        className="mt-auto flex items-center gap-3 pt-3.5"
        style={{ borderTop: `1px solid ${NAVY_3}` }}
      >
        <button
          type="button"
          onClick={() => set(() => setStep(Math.max(1, step - 1)))}
          className="h-[50px] cursor-pointer rounded-[12px] bg-transparent px-[26px] text-[15px] font-bold tracking-[0.04em]"
          style={{ border: `2px solid ${SUNLIGHT}`, color: SUNLIGHT }}
        >
          BACK
        </button>
        <span className="flex-grow" />
        <button
          type="button"
          aria-label="Ask EasyLink AI"
          title="Not built yet"
          className="flex h-[50px] cursor-help items-center gap-2 rounded-full py-0 pl-2 pr-4 text-[13px] font-bold text-white"
          style={{ background: NAVY_2, border: `1px solid ${NAVY_LINE}` }}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: SUN_GRAD_135 }}>
            <Icon
              d="M12 8V4H8M6 8h12a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-8a2 2 0 0 1 2 -2zM2 14h2M20 14h2M15 13v2M9 13v2"
              size={20}
              stroke={SUN_INK}
              width={2}
            />
          </span>
          EasyLink AI
        </button>
        <button
          type="button"
          onClick={() => set(() => setStep(Math.min(9, step + 1)))}
          className="h-[50px] cursor-pointer rounded-[12px] border-0 px-[30px] text-[15px] font-bold tracking-[0.04em]"
          style={{ background: SUN_GRAD, color: SUN_INK }}
        >
          {step === 8 ? "FINISH" : step === 9 ? "DONE" : "NEXT"}
        </button>
      </div>
    </div>
  );
}

/** One equipment card on step 7. */
function EquipCard({
  kind,
  icon,
  tag,
  on,
  sku,
  btn,
  brands,
  brandValue,
  onBrand,
  models,
  modelValue,
  onModel,
  onToggle,
  qty,
}: {
  kind: string;
  icon: string;
  tag: string;
  on: boolean;
  sku: string;
  btn: string;
  brands: string[];
  brandValue?: string;
  onBrand?: (v: string) => void;
  models: [string, string][];
  modelValue?: string;
  onModel?: (v: string) => void;
  onToggle?: () => void;
  qty?: React.ReactNode;
}) {
  return (
    <section
      aria-label={kind}
      className="flex flex-col gap-2.5 rounded-[16px] bg-white p-3.5 text-[#0F172A]"
      style={{ border: `3px solid ${on ? SUN : "#E3E8EF"}` }}
    >
      <div className="flex h-[84px] items-center justify-center rounded-[12px] bg-[#F4F6FA]">
        <Icon d={icon} size={48} stroke={NAVY_3} width={1.6} />
      </div>
      <div className="flex items-center gap-1.5">
        <strong className="flex-grow text-[16px]">{kind}</strong>
        <span className="text-[11px] font-bold" style={{ color: tag === "Required" ? "#92400E" : SLATE }}>
          {tag}
        </span>
      </div>
      <label className="flex flex-col gap-[3px] text-[12px] font-semibold" style={{ color: SLATE }}>
        Select brand
        <select
          value={brandValue}
          onChange={(e) => onBrand?.(e.target.value)}
          disabled={!onBrand}
          className="h-[42px] rounded-[10px] bg-white px-2 text-[13px] text-[#0F172A] disabled:cursor-default"
          style={{ border: "1px solid #CBD5E1" }}
        >
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-[3px] text-[12px] font-semibold" style={{ color: SLATE }}>
        Select model
        <select
          value={modelValue}
          onChange={(e) => onModel?.(e.target.value)}
          disabled={!onModel}
          className="h-[42px] rounded-[10px] bg-white px-2 text-[13px] text-[#0F172A] disabled:cursor-default"
          style={{ border: "1px solid #CBD5E1" }}
        >
          {models.map(([k, n]) => (
            <option key={k} value={k}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <code className="text-[11px]" style={{ color: SLATE }}>
        {sku}
      </code>
      {qty}
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={on}
        disabled={!onToggle}
        className="h-11 cursor-pointer rounded-[10px] border-0 text-[14px] font-bold disabled:cursor-default"
        style={{ background: on ? NAVY : SUN, color: on ? SUNLIGHT : SUN_INK }}
      >
        {btn}
      </button>
    </section>
  );
}
