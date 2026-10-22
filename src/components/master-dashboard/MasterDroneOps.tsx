"use client";

import { useState } from "react";

import {
  MasterAiSuggestCard,
  type AiSuggestMode,
} from "@/components/master-dashboard/MasterAiSuggestCard";

/**
 * Matches the Easylink Designer "Drone flights" mock (DroneOps.dc.html) — the
 * week's flights, every pre-flight check the drone ops agent ran, and the
 * drone and pilot register behind them.
 *
 * Sample data: this app has no drone register, flight planner or airspace
 * integration. The live behaviour is the mock's own — picking a flight
 * recomputes its checks, since several of them depend on which pilot and site
 * the flight is for.
 */

/** [background, foreground] */
const PASS: [string, string] = ["#DCFCE7", "#166534"];
const WATCH: [string, string] = ["#FEF3C7", "#92400E"];
const FAIL: [string, string] = ["#FEE2E2", "#991B1B"];

/** [text, palette, result] — a check whose answer depends on the flight. */
type Check = [string, [string, string], string];

type Flight = {
  id: string;
  when: string;
  site: string;
  type: string;
  src: string;
  status: string;
  pill: [string, string];
  /** Pilot licence check for this flight's assigned pilot. */
  licence: Check;
  /** Airspace check for this flight's site. */
  airspace: Check;
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

const MORGAN: Check = ["J. Morgan: RePL valid to Aug 2027", PASS, "Pass"];
const CLEAR_AIRSPACE: Check = ["Outside controlled airspace", PASS, "Pass"];

const FLIGHTS: Flight[] = [
  {
    id: "FLT-0418",
    when: "Mon 20 Oct, 9:30 am",
    site: "D. Moretti · Yagoona",
    type: "Inspection, RGB + thermal",
    src: "booked from a low-yield alert",
    status: "Ready",
    pill: PASS,
    licence: MORGAN,
    airspace: CLEAR_AIRSPACE,
    ai: {
      mode: "done",
      title: "Booked the flight and sent the neighbour notice",
      why: "Customer approved the inspection. All checks passed, so the flight was booked inside policy.",
      evidence: "drone and pilot register, airspace, forecast",
      rule: "POL-DRONE-04 · all checks passed",
      primary: "Approve",
      dec: "DEC-918480",
    },
  },
  {
    id: "FLT-0419",
    when: "Mon 20 Oct, 1:00 pm",
    site: "S. Patel · Castle Hill",
    type: "Post-install check",
    src: "installer request",
    status: "Ready",
    pill: PASS,
    licence: MORGAN,
    airspace: CLEAR_AIRSPACE,
    ai: {
      mode: "done",
      title: "Booked the flight",
      why: "Post-install check requested by the installer. All checks passed.",
      evidence: "register, airspace, forecast",
      rule: "POL-DRONE-04",
      primary: "Approve",
      dec: "DEC-918481",
    },
  },
  {
    id: "FLT-0420",
    when: "Tue 21 Oct, 10:00 am",
    site: "M. Rossi · Penrith",
    type: "Inspection, RGB + thermal",
    src: "installer request",
    status: "Blocked",
    pill: FAIL,
    licence: ["R. Singh: RePL expired 8 Oct", FAIL, "Fail"],
    airspace: CLEAR_AIRSPACE,
    ai: {
      mode: "approve",
      title: "Reassign this flight to J. Morgan on Wed 22 Oct",
      why: "R. Singh’s remote pilot licence has expired, so the flight is blocked. J. Morgan is free on Wednesday morning and the forecast is clear.",
      evidence: "pilot register, roster, forecast",
      rule: "POL-DRONE-04 · hard stop on expired licence",
      primary: "Reassign",
      dec: "DEC-918484",
    },
  },
  {
    id: "FLT-0421",
    when: "Wed 22 Oct, 9:00 am",
    site: "A. Khan · Ryde",
    type: "Clean verification",
    src: "after a cleaning job",
    status: "Weather watch",
    pill: WATCH,
    licence: MORGAN,
    airspace: ["Hospital helipad 1.9 km away", WATCH, "Chief pilot"],
    ai: {
      mode: "approve",
      title: "Keep the flight under 30 m over the roof only",
      why: "A helipad is within 3 km. The plan stays low over the customer’s roof; the chief pilot must sign off.",
      evidence: "airspace check, site map",
      rule: "POL-DRONE-04 · helipad within 3 km",
      primary: "Sign off as chief pilot",
      dec: "DEC-918486",
    },
  },
];

/**
 * The six checks, in the mock's order. Three are fixed, three are derived
 * from the flight — which is why they are rebuilt per selection rather than
 * stored on each flight.
 */
function checksFor(f: Flight): Check[] {
  const weatherHeld = f.status === "Weather watch";
  return [
    ["Drone DR-01 active, maintenance current", PASS, "Pass"],
    f.licence,
    ["Operator certificate and aviation insurance", PASS, "Pass"],
    [`Airspace via CASA-verified app: ${f.airspace[0]}`, f.airspace[1], f.airspace[2]],
    [
      "Weather window: wind 12 km/h, no rain",
      weatherHeld ? WATCH : PASS,
      weatherHeld ? "Watch" : "Pass",
    ],
    ["Customer consent and neighbour notice", PASS, "Sent"],
  ];
}

/** [name, use or licence, next due, status, palette] */
const FLEET: [string, string, string, string, [string, string]][] = [
  ["DR-01 · [model]", "RGB and thermal inspection", "Service 2 Dec", "Active", PASS],
  ["DR-02 · [model]", "RGB and thermal inspection", "Service 18 Nov", "Active", PASS],
  ["DR-03 · [model]", "Water-fed cleaning, tethered", "Service due now", "Grounded", FAIL],
  ["J. Morgan", "RePL · chief remote pilot", "Aug 2027", "Current", PASS],
  ["R. Singh", "RePL", "Expired 8 Oct", "Can’t fly", FAIL],
];

const TH = "border-b border-[#E3E8EF] p-2 font-semibold";
const TD = "border-b border-[#EEF2F6] px-2 py-2.5";

export function MasterDroneOps() {
  const [selected, setSelected] = useState(0);
  const sel = FLIGHTS[selected]!;
  const checks = checksFor(sel);

  return (
    <div className="flex min-h-full flex-col text-[#0F172A]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          Energy services <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Drone flights</span>
        </nav>
        <span className="rounded-full bg-[#DBEAFE] px-2.5 py-[3px] text-[12px] font-bold text-[#1E40AF]">
          Sample data
        </span>
        <span
          title="Not built yet"
          className="flex h-[38px] cursor-default items-center rounded-[10px] border border-[#CBD5E1] bg-white px-3.5 text-[13px] font-semibold text-[#94A3B8]"
        >
          Plan a flight
        </span>
      </header>

      <div className="flex w-full max-w-[1400px] flex-col gap-[18px] px-8 py-6 pb-14">
        <div>
          <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
            6 flights this week; 1 blocked until a licence renews
          </h1>
          <p className="mb-0 mt-1 text-[13px] text-[#5B6B80]">
            The drone ops agent plans each flight and runs every check. The remote pilot in command
            confirms on site and can stop any flight.
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-4">
          <section
            aria-label="Schedule"
            className="min-w-0 flex-[1_1_360px] overflow-hidden rounded-[14px] border border-[#E3E8EF] bg-white"
          >
            <h2 className="m-0 px-4 py-3.5 text-[16px] font-bold text-[#0F172A]">
              Week of 20 October
            </h2>
            {FLIGHTS.map((f, i) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelected(i)}
                aria-current={i === selected ? "true" : undefined}
                className="flex w-full flex-col gap-[3px] border-t border-[#EEF2F6] px-4 py-3 text-left"
                style={{ background: i === selected ? "#FFF7E6" : "#FFFFFF" }}
              >
                <span className="flex items-center gap-2">
                  <strong className="flex-grow text-[14px]">{f.when}</strong>
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                    style={{ background: f.pill[0], color: f.pill[1] }}
                  >
                    {f.status}
                  </span>
                </span>
                <span className="text-[13px]">{f.site}</span>
                <span className="text-[12px] text-[#5B6B80]">
                  {f.type} · {f.src}
                </span>
              </button>
            ))}
          </section>

          <section
            aria-label="Flight detail"
            className="flex min-w-0 flex-[2_1_520px] flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
          >
            <div className="flex flex-wrap items-start gap-2">
              <div className="flex-grow">
                <span className="font-mono text-[12px] text-[#5B6B80]">{sel.id}</span>
                <h2 className="mb-0 mt-0.5 text-[20px] font-bold text-[#0F172A]">{sel.site}</h2>
                <span className="text-[13px] text-[#475569]">
                  {sel.when} · {sel.type}
                </span>
              </div>
              <span
                className="rounded-full px-2.5 py-[3px] text-[12px] font-bold"
                style={{ background: sel.pill[0], color: sel.pill[1] }}
              >
                {sel.status}
              </span>
            </div>

            <h3 className="mb-0 mt-1 text-[14px] font-bold text-[#0F172A]">
              Checks run by the drone ops agent
            </h3>
            {checks.map(([text, [bg, fg], result]) => (
              <div
                key={text}
                className="flex flex-wrap items-center gap-2 border-b border-[#EEF2F6] py-2.5 text-[13px]"
              >
                <span className="flex-[1_1_260px]">{text}</span>
                <span
                  className="rounded-full px-[9px] py-0.5 text-[12px] font-bold"
                  style={{ background: bg, color: fg }}
                >
                  {result}
                </span>
              </div>
            ))}

            <MasterAiSuggestCard
              agent="Drone ops"
              mode={sel.ai.mode}
              title={sel.ai.title}
              why={sel.ai.why}
              evidence={sel.ai.evidence}
              rule={sel.ai.rule}
              primary={sel.ai.primary}
              dec={sel.ai.dec}
            />
          </section>
        </div>

        <section
          aria-label="Fleet and pilots"
          className="flex flex-col gap-2.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Drones and pilots</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-[#475569]">
                  <th className={TH}>Drone or pilot</th>
                  <th className={TH}>Use or licence</th>
                  <th className={TH}>Next due</th>
                  <th className={TH}>Status</th>
                </tr>
              </thead>
              <tbody>
                {FLEET.map(([name, use, due, status, [bg, fg]]) => (
                  <tr key={name}>
                    <td className={`${TD} font-semibold`}>{name}</td>
                    <td className={TD}>{use}</td>
                    <td className={TD}>{due}</td>
                    <td className={TD}>
                      <span
                        className="rounded-full px-[9px] py-0.5 text-[12px] font-bold"
                        style={{ background: bg, color: fg }}
                      >
                        {status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <span className="text-[12px] text-[#475569]">
            Images of neighbouring properties are masked before storage. Flight logs are kept for
            CASA records.
          </span>
        </section>
      </div>
    </div>
  );
}
