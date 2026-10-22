"use client";

import { useState } from "react";

import { MasterAiSuggestCard } from "@/components/master-dashboard/MasterAiSuggestCard";

/**
 * Matches the Easylink Designer "VPP trading" mock (VPPOps.dc.html) — the
 * price forecast the optimiser bids against, what the fleet can deliver, and
 * the agent's calls on customer notices and misbehaving sites.
 *
 * Sample data: this app has no market connection, optimiser or battery
 * fleet. The live behaviour is the mock's own — the pause switch is real
 * client state, because the whole point of the control is seeing what it
 * does to the fleet's availability.
 */

const NAVY = "#0B1A2E";
const SUN = "#F68A0A";

/** NSW1 price per 5-minute interval, noon to 9 pm, $/MWh. */
const PRICES = [
  62, 48, 41, 38, 40, 44, 52, 58, 61, 66, 72, 80, 95, 120, 160, 230, 360, 620, 980, 1450, 1180,
  860, 560, 380, 290, 230, 190, 170, 160, 150, 140, 135, 130, 128, 125, 122,
];

/** Last interval with a settled price; everything after it is forecast. */
const NOW = 11;
/** The intervals the fleet is planning to discharge across. */
const DISCHARGE_FROM = 17;
const DISCHARGE_TO = 22;
/** Chart is scaled to a fixed ceiling so the spike stays comparable day to day. */
const CHART_CEILING = 1500;

/** [background, foreground] */
const GOOD: [string, string] = ["#DCFCE7", "#166534"];
const FAIR: [string, string] = ["#FEF3C7", "#92400E"];

/** [interval, market, target, delivered, result, palette] */
const EVENTS: [string, string, string, string, string, [string, string]][] = [
  ["6 Oct, 6:05–6:45 pm", "Energy", "1.52 MW", "1.47 MW", "97%", GOOD],
  ["2 Oct, 5:40–6:20 pm", "Energy", "1.40 MW", "1.33 MW", "95%", GOOD],
  ["26 Sep, 3:12 pm", "Raise 6 s FCAS", "0.80 MW", "0.71 MW", "89%", FAIR],
  ["22 Sep, 6:10–6:50 pm", "Energy", "1.31 MW", "1.29 MW", "98%", GOOD],
];

const TH = "border-b border-[#E3E8EF] p-2 font-semibold";
const TD = "border-b border-[#EEF2F6] px-2 py-2.5";

/** A colour key for the chart. */
function Key({ label, swatch }: { label: string; swatch: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px]">
      <span aria-hidden="true" className="size-3 rounded-[3px]" style={{ background: swatch }} />
      {label}
    </span>
  );
}

export function MasterVppOps() {
  const [paused, setPaused] = useState(false);

  const kpis: [string, string, string][] = [
    ["Sites in the VPP", "412", "9 opted out of tonight"],
    // Pausing holds every battery in self-consumption, so nothing is offered
    // to the market — the headline number has to say so.
    ["Available now", paused ? "0 MW" : "1.84 MW", "5.2 MWh above reserves"],
    ["Price now", "$85", "per MWh"],
    ["Delivery, 7 days", "96.4%", "of targets met"],
    ["Revenue this month", "A$[VPP]", "before customer share"],
  ];

  return (
    <div className="flex min-h-full flex-col text-[#0F172A]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          Energy services <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">VPP trading</span>
        </nav>
        <span className="rounded-full bg-[#DBEAFE] px-2.5 py-[3px] text-[12px] font-bold text-[#1E40AF]">
          Sample data
        </span>
        <span className="text-[12px] text-[#5B6B80]">
          NSW1 · bids via [Retailer partner] · interval ending 2:40 pm
        </span>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          className="h-[38px] rounded-[10px] px-3.5 text-[13px] font-bold text-white"
          style={{ background: paused ? NAVY : "#B91C1C" }}
        >
          {paused ? "Resume dispatch" : "Pause all dispatch"}
        </button>
      </header>

      <div className="flex w-full max-w-[1400px] flex-col gap-[18px] px-8 py-6 pb-14">
        {paused ? (
          <p
            role="status"
            className="m-0 rounded-[10px] bg-[#FEE2E2] px-3.5 py-3 text-[14px] font-semibold text-[#991B1B]"
          >
            Dispatch paused by you. No bids are sent and every battery runs in its own
            self-consumption mode. Logged.
          </p>
        ) : null}

        <div>
          <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
            Price spike forecast at 5:30 pm; fleet will discharge 1.6 MW
          </h1>
          <p className="mb-0 mt-1 text-[13px] text-[#5B6B80]">
            The optimiser (code, not a model) bids every 5 minutes. Each site&rsquo;s reserve,
            monthly event cap and network export limit is applied before a bid leaves.
          </p>
        </div>

        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}
        >
          {kpis.map(([label, value, sub]) => (
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

        <section
          aria-label="Price forecast"
          className="flex flex-col gap-2.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="m-0 flex-grow text-[16px] font-bold text-[#0F172A]">
              NSW1 energy price, $/MWh, actual and forecast
            </h2>
            <Key label="Actual" swatch={NAVY} />
            <Key label="Forecast" swatch={SUN} />
            <span className="inline-flex items-center gap-1.5 text-[12px]">
              <span
                aria-hidden="true"
                className="size-3 rounded-[3px] border border-[#22C55E] bg-[#DCFCE7]"
              />
              Planned discharge
            </span>
          </div>

          <div
            role="img"
            aria-label="Price low through the afternoon, forecast to peak near 1,450 dollars per megawatt hour at 5:30 pm, when the fleet discharges"
            className="flex h-[180px] items-end gap-[3px] border-b border-[#E3E8EF]"
          >
            {PRICES.map((price, i) => (
              <span
                key={i}
                title={`$${price}/MWh`}
                className="min-h-[2px] flex-1 rounded-t-[3px]"
                style={{
                  height: `${Math.max(1, Math.round((price / CHART_CEILING) * 100))}%`,
                  background: i <= NOW ? NAVY : SUN,
                  boxShadow:
                    i >= DISCHARGE_FROM && i <= DISCHARGE_TO ? "0 0 0 3px #BBF7D0" : "none",
                }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[12px] text-[#5B6B80]">
            <span>12 pm</span>
            <span>3 pm · now</span>
            <span>6 pm</span>
            <span>9 pm</span>
          </div>
        </section>

        <div className="flex flex-wrap items-start gap-4">
          <section
            aria-label="Dispatch events"
            className="flex min-w-0 flex-[2_1_520px] flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
          >
            <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Recent dispatch events</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-[13px]">
                <thead>
                  <tr className="text-left text-[#475569]">
                    <th className={TH}>Interval</th>
                    <th className={TH}>Market</th>
                    <th className={`${TH} text-right`}>Target</th>
                    <th className={`${TH} text-right`}>Delivered</th>
                    <th className={TH}>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {EVENTS.map(([interval, market, target, delivered, result, [bg, fg]]) => (
                    <tr key={interval}>
                      <td className={TD}>{interval}</td>
                      <td className={TD}>{market}</td>
                      <td className={`${TD} text-right tabular-nums`}>{target}</td>
                      <td className={`${TD} text-right tabular-nums`}>{delivered}</td>
                      <td className={TD}>
                        <span
                          className="rounded-full px-[9px] py-0.5 text-[12px] font-bold"
                          style={{ background: bg, color: fg }}
                        >
                          {result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section
            aria-label="VPP agent"
            className="flex min-w-0 flex-[1_1_360px] flex-col gap-3"
          >
            <MasterAiSuggestCard
              agent="VPP"
              mode="done"
              title="Told 412 customers about tonight’s likely event"
              why="Each customer got an app notice with the time window, their estimated credit and a one-tap opt-out. 9 have opted out; the optimiser re-planned without them."
              evidence="price forecast, enrolment limits"
              rule="POL-CONTACT-01 · service messages allowed"
              dec="DEC-918490"
            />
            <MasterAiSuggestCard
              agent="VPP"
              mode="approve"
              title="Pause SITE-2291 after 3 missed events"
              why="The battery ignored three commands while its cloud link was healthy. Pausing it stops it dragging down delivery while a control check runs."
              evidence="dispatch log, telemetry"
              rule="POL-VPP-05 · VPP operator approves"
              primary="Pause and check"
              dec="DEC-918458"
            />
          </section>
        </div>
      </div>
    </div>
  );
}
