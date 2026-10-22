"use client";

import Link from "next/link";
import { useState } from "react";

import {
  MasterAiSuggestCard,
  type AiSuggestMode,
} from "@/components/master-dashboard/MasterAiSuggestCard";

/**
 * Matches the Easylink Designer "Live fleet & alerts" mock (FleetLive.dc.html)
 * — every connected site's output against what its roof should make today, the
 * open alerts, and the care agent's diagnosis of the selected one.
 *
 * Sample data: this app has no telemetry ingestion, vendor-cloud connections
 * or care agent. The live behaviour is the mock's own — picking an alert
 * swaps the chart and the agent's suggestion, and the suggestion card keeps
 * its own approve/edit/reject state.
 */

const SUN = "#F68A0A";
const RED = "#991B1B";
const BLUE = "#1976D2";

/** Alert-type pill palettes. */
const WARN: [string, string] = ["#FEF3C7", "#92400E"];
const DANGER: [string, string] = ["#FEE2E2", "#991B1B"];
const INFO: [string, string] = ["#EEF7FE", "#0B2540"];

/** What each day's roof should have made, for the last 14 days. */
const EXPECTED = [78, 82, 60, 85, 88, 84, 40, 86, 87, 85, 88, 84, 86, 83];

type Alert = {
  site: string;
  type: string;
  pill: [string, string];
  short: string;
  sys: string;
  /** What the site actually made each day. */
  actual: number[];
  colour: string;
  chartLabel: string;
  ai: {
    mode: AiSuggestMode;
    title: string;
    why: string;
    evidence?: string;
    rule?: string;
    primary: string;
    dec: string;
  };
};

/** The mock's own per-alert shapes, kept as the formulas it derives them with. */
const dipFrom = (from: number, factor: number) =>
  EXPECTED.map((v, i) => (i > from ? Math.round(v * factor) : v));

const ALERTS: Alert[] = [
  {
    site: "D. Moretti · Yagoona",
    type: "Low yield",
    pill: WARN,
    short: "8 to 10% under expected for 7 clear days",
    sys: "14.52 kW · FoxESS 9.9 kW · 32.6 kWh",
    actual: EXPECTED.map((v, i) => (i > 6 ? Math.round(v * 0.91) : v - 2)),
    colour: SUN,
    chartLabel:
      "Output tracks expected until a week ago, then runs about 9 percent below",
    ai: {
      mode: "approve",
      title: "Offer a drone inspection and clean to Daniel Moretti",
      why: "Output has been 8 to 10% under expected for 7 clear days, spread evenly across panels. That points to dust or droppings rather than a fault. Never cleaned.",
      evidence: "14 days of telemetry, irradiance, panel layout",
      rule: "POL-CARE-02 · paid services need customer approval",
      primary: "Send offer to customer",
      dec: "DEC-918471",
    },
  },
  {
    site: "M. Rossi · Penrith",
    type: "Offline",
    pill: DANGER,
    short: "No data for 26 hours · vendor cloud reachable",
    sys: "40 kWh FoxESS battery",
    actual: EXPECTED.map((v, i) => (i > 12 ? 0 : v)),
    colour: RED,
    chartLabel: "Normal output, then no data for the last day",
    ai: {
      mode: "done",
      title: "Asked the customer to check the Wi-Fi and power-cycled the gateway",
      why: "The vendor cloud is up but this site stopped reporting, which usually means the home Wi-Fi changed. An SMS went with simple steps.",
      evidence: "vendor cloud status, last-seen time",
      rule: "POL-CONTACT-01 · service messages allowed",
      primary: "Approve",
      dec: "DEC-918460",
    },
  },
  {
    site: "J. Wright · Kellyville",
    type: "Fault code",
    pill: DANGER,
    short: "Inverter isolation fault, 3 times today",
    sys: "10.1 kW · FoxESS 9.9 kW",
    actual: dipFrom(11, 0.5),
    colour: RED,
    chartLabel: "Output halves over the last two days",
    ai: {
      mode: "approve",
      title: "Open a warranty claim and book Solarman for an isolation test",
      why: "Three isolation faults today and output halved. That needs an electrician on site; the claim goes to the manufacturer with the fault log.",
      evidence: "fault codes, 14 days of telemetry, install record",
      rule: "POL-SIGN-01 · electrical work stays with a licensed person",
      primary: "Open claim and book",
      dec: "DEC-918466",
    },
  },
  {
    site: "SITE-2291 · Penrith",
    type: "VPP miss",
    pill: INFO,
    short: "Ignored 3 dispatch commands",
    sys: "18 kWh Sigenergy",
    actual: EXPECTED,
    colour: BLUE,
    chartLabel: "Solar output normal",
    ai: {
      mode: "approve",
      title: "Pause VPP dispatch for this site and run a control check",
      why: "The battery ignored the last three commands while its cloud link was healthy, so a local setting may have changed.",
      evidence: "dispatch log, telemetry",
      rule: "POL-VPP-05 · pausing a site needs the VPP operator",
      primary: "Pause and check",
      dec: "DEC-918458",
    },
  },
  {
    site: "A. Khan · Ryde",
    type: "Battery",
    pill: WARN,
    short: "Battery not charging above 80%",
    sys: "13.5 kWh battery",
    actual: EXPECTED,
    colour: SUN,
    chartLabel: "Solar output normal",
    ai: {
      mode: "info",
      title: "Battery charge limit looks set to 80% in the app",
      why: "The battery stops at exactly 80% every day. That matches a charge limit setting, not a fault. Suggest telling the customer how to change it.",
      evidence: "30 days of state of charge",
      primary: "Tell the customer",
      dec: "DEC-918469",
    },
  },
];

const KPIS: [string, string, string][] = [
  ["Sites connected", "1,204", "1,186 online now"],
  ["Fleet output today", "38.2 MWh", "97% of expected"],
  ["Batteries", "412", "in the VPP · avg 64% charged"],
  ["Open alerts", "5", "3 diagnosed by the care agent"],
  ["Warranty claims", "2", "opened with telemetry attached"],
];

const OK = "#166534";
const AMBER = "#92400E";

const BRANDS: [string, string, string, string, string, string][] = [
  ["FoxESS", "Vendor cloud, partner API", "684", "679", "Healthy", OK],
  ["Sigenergy", "Vendor cloud", "318", "316", "Healthy", OK],
  ["BLUETTI EP2000 / EP760", "App cloud", "142", "138", "Healthy", OK],
  ["Other brands", "EasyLink site gateway (Modbus)", "60", "53", "7 gateways offline", AMBER],
];

const TH = "border-b border-[#E3E8EF] p-2 font-semibold";
const TD = "border-b border-[#EEF2F6] px-2 py-2.5";

/** A target this app has no page for yet. */
function Unbuilt({ children }: { children: string }) {
  return (
    <span
      title="Not built yet"
      className="inline-flex h-11 cursor-default items-center rounded-[10px] border border-[#CBD5E1] px-4 text-[14px] font-semibold text-[#94A3B8]"
    >
      {children}
    </span>
  );
}

export function MasterFleetLive() {
  const [selected, setSelected] = useState(0);
  const sel = ALERTS[selected]!;

  return (
    <div className="flex min-h-full flex-col text-[#0F172A]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          Energy services <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Live fleet &amp; alerts</span>
        </nav>
        <span className="rounded-full bg-[#DBEAFE] px-2.5 py-[3px] text-[12px] font-bold text-[#1E40AF]">
          Sample data
        </span>
        <span className="text-[12px] text-[#5B6B80]">
          Updated 2:40 pm · vendor clouds every 5 min, gateways every 10 s
        </span>
      </header>

      <div className="flex w-full max-w-[1400px] flex-col gap-[18px] px-8 py-6 pb-14">
        <div>
          <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
            1,186 sites online; 5 need attention
          </h1>
          <p className="mb-0 mt-1 text-[13px] text-[#5B6B80]">
            Each site&rsquo;s output is compared with what its roof should make in today&rsquo;s
            weather. The care agent diagnoses each alert and books the right fix.
          </p>
        </div>

        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}
        >
          {KPIS.map(([label, value, sub]) => (
            <div
              key={label}
              className="flex flex-col gap-0.5 rounded-[14px] border border-[#E3E8EF] bg-white px-4 py-3.5"
            >
              <span className="text-[12px] font-semibold text-[#5B6B80]">{label}</span>
              <span className="font-source-sans text-[28px] font-bold tabular-nums">{value}</span>
              <span className="text-[12px] text-[#475569]">{sub}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-start gap-4">
          <section
            aria-label="Alerts"
            className="min-w-0 flex-[1_1_380px] overflow-hidden rounded-[14px] border border-[#E3E8EF] bg-white"
          >
            <h2 className="m-0 px-4 py-3.5 text-[16px] font-bold text-[#0F172A]">Open alerts</h2>
            {ALERTS.map((a, i) => (
              <button
                key={a.site}
                type="button"
                onClick={() => setSelected(i)}
                aria-current={i === selected ? "true" : undefined}
                className="flex w-full flex-col gap-[3px] border-t border-[#EEF2F6] px-4 py-3 text-left"
                style={{ background: i === selected ? "#FFF7E6" : "#FFFFFF" }}
              >
                <span className="flex items-center gap-2">
                  <strong className="flex-grow text-[14px]">{a.site}</strong>
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                    style={{ background: a.pill[0], color: a.pill[1] }}
                  >
                    {a.type}
                  </span>
                </span>
                <span className="text-[12px] text-[#475569]">{a.short}</span>
              </button>
            ))}
          </section>

          <section
            aria-label="Alert detail"
            className="flex min-w-0 flex-[2_1_520px] flex-col gap-3.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="m-0 flex-grow text-[20px] font-bold text-[#0F172A]">{sel.site}</h2>
              <span className="text-[12px] text-[#5B6B80]">{sel.sys}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold text-[#475569]">
                Actual vs expected output, last 14 days (kWh per day)
              </span>
              <div
                role="img"
                aria-label={sel.chartLabel}
                className="flex h-[120px] items-end gap-1 border-b border-[#E3E8EF] py-2"
              >
                {EXPECTED.map((expected, i) => (
                  <span key={i} className="relative flex h-full flex-1 items-end">
                    <span
                      className="absolute bottom-0 w-full rounded-t-[4px] bg-[#E2E8F0]"
                      style={{ height: `${expected}%` }}
                    />
                    <span
                      className="relative w-full rounded-t-[4px]"
                      style={{ height: `${sel.actual[i]}%`, background: sel.colour }}
                    />
                  </span>
                ))}
              </div>
              <span className="text-[12px] text-[#5B6B80]">
                Grey: expected for that day&rsquo;s sunshine · coloured: what the site made
              </span>
            </div>

            <MasterAiSuggestCard
              agent="Care"
              mode={sel.ai.mode}
              title={sel.ai.title}
              why={sel.ai.why}
              evidence={sel.ai.evidence}
              rule={sel.ai.rule}
              primary={sel.ai.primary}
              dec={sel.ai.dec}
            />

            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/master/drone-flights"
                className="inline-flex h-11 items-center rounded-[10px] border border-[#CBD5E1] px-4 text-[14px] font-semibold text-[#0F172A]"
              >
                Plan a drone flight
              </Link>
              <Unbuilt>See what the customer sees</Unbuilt>
            </div>
          </section>
        </div>

        <section
          aria-label="Connections"
          className="flex flex-col gap-2.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Connections by brand</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-[#475569]">
                  <th className={TH}>Brand</th>
                  <th className={TH}>How</th>
                  <th className={`${TH} text-right`}>Sites</th>
                  <th className={`${TH} text-right`}>Online</th>
                  <th className={TH}>Status</th>
                </tr>
              </thead>
              <tbody>
                {BRANDS.map(([name, how, sites, online, status, colour]) => (
                  <tr key={name}>
                    <td className={`${TD} font-semibold`}>{name}</td>
                    <td className={TD}>{how}</td>
                    <td className={`${TD} text-right tabular-nums`}>{sites}</td>
                    <td className={`${TD} text-right tabular-nums`}>{online}</td>
                    <td className={`${TD} font-semibold`} style={{ color: colour }}>
                      {status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
