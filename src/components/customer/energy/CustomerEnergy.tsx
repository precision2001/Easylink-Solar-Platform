"use client";

import { useState } from "react";
import Link from "next/link";
import { CustomerTopNav } from "@/components/customer/portal/CustomerTopNav";

/**
 * Matches the Easylink Designer "Energy" mock (CustEnergy.dc.html) — live
 * power flow, today's output against what the roof should have made, the AI
 * Care agent's inspection offer, and the connected devices.
 *
 * Every figure here is the mock's sample data, and unavoidably so: this app
 * reads no inverter. There is no telemetry endpoint, no stored reading, no
 * device link and no consent record — the page's whole subject does not exist
 * in the data model yet. A "Live · updated 2:40 pm" line over invented numbers
 * would be the most misleading thing on the site, so the header says plainly
 * that nothing is connected and the timestamp is not dressed up as live.
 *
 * The AI Care agent's three buttons are inert. "See the offer" would commit
 * the customer to paid work, and the mock's own rule — "we never book paid
 * work without you" — is exactly why a preview must not look like it booked
 * something.
 */

const SUN_INK = "#3B1D00";
const INK = "#0F172A";
const MUTED = "#5B6B80";
const SLATE = "#475569";
const BODY = "#334155";
const BORDER = "#E3E8EF";
const RULE = "#EEF2F6";
const NAVY = "#0B1A2E";
const GREEN = "#166534";

const RANGES = ["Today", "Week", "Month", "Year"];

/** The four live-flow tiles, in the mock's order and colours. */
const FLOW = [
  {
    label: "Solar",
    value: "5.8 kW",
    detail: "Generating",
    background: "linear-gradient(135deg, #FFD24A, #F68A0A)",
    colour: SUN_INK,
  },
  {
    label: "Home",
    value: "1.1 kW",
    detail: "All from solar",
    background: "#13263F",
    colour: "#FFFFFF",
  },
  {
    label: "Battery · 72%",
    value: "2.9 kW",
    detail: "Charging · full by about 4:30 pm",
    background: "linear-gradient(135deg, #34D399, #10B981)",
    colour: "#05301F",
  },
  {
    label: "Grid",
    value: "1.8 kW",
    detail: "Exporting · [feed-in] c/kWh",
    background: "linear-gradient(135deg, #38BDF8, #0EA5E9)",
    colour: "#06293D",
  },
];

/**
 * Today's half-hourly output. `made` is null after "now" — the mock greys the
 * rest of the day as expected-but-not-yet-generated.
 */
const HOURS: { label: string | null; made: number | null; expected: number }[] = [
  { label: "6 am", made: 4, expected: 5 },
  { label: null, made: 14, expected: 16 },
  { label: null, made: 30, expected: 33 },
  { label: null, made: 48, expected: 52 },
  { label: "12 pm", made: 62, expected: 68 },
  { label: null, made: 74, expected: 80 },
  { label: null, made: 82, expected: 88 },
  { label: null, made: 86, expected: 92 },
  { label: "now", made: 78, expected: 84 },
  { label: null, made: null, expected: 66 },
  { label: null, made: null, expected: 48 },
  { label: null, made: null, expected: 30 },
  { label: null, made: null, expected: 14 },
  { label: "7 pm", made: null, expected: 5 },
];

const TOTALS = [
  { label: "Generated", value: "44.1 kWh" },
  { label: "Exported", value: "21.3 kWh" },
  { label: "Bought from grid", value: "0.8 kWh" },
  { label: "Saved today", value: "A$[x]", good: true },
];

const DEVICES = [
  { name: "FOXESS 9.9 kW hybrid inverter", state: "Online" },
  { name: "FOX ESS 32.61 kWh battery", state: "Online" },
];

export function CustomerEnergy() {
  const [range, setRange] = useState("Today");

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6FA]" style={{ color: INK }}>
      <CustomerTopNav active="energy" />

      <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-[18px] px-6 pt-6 pb-14">
        <div className="flex flex-wrap items-end gap-3.5">
          <div className="grow">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-bold" style={{ color: MUTED }}>
                Sample reading · not live
              </span>
              <span
                title="No inverter is connected to this app yet — there is no telemetry endpoint, stored reading or device link behind this page"
                className="cursor-help rounded-full px-2.5 py-0.75 text-[12px] font-bold"
                style={{ background: "#DBEAFE", color: "#1E40AF" }}
              >
                Sample data
              </span>
            </div>
            <h1 className="mt-1 mb-0 font-source-sans text-[28px] font-bold">
              You&rsquo;re exporting 1.8 kW right now
            </h1>
          </div>
          <div
            role="group"
            aria-label="Range"
            className="flex gap-1 rounded-[10px] bg-white p-1"
            style={{ border: `1px solid ${BORDER}` }}
          >
            {RANGES.map((r) => {
              const on = r === range;
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setRange(r)}
                  className="h-9 rounded-lg px-3.5 text-[13px] font-semibold"
                  style={{
                    background: on ? "#FFFFFF" : "transparent",
                    color: on ? INK : SLATE,
                    boxShadow: on ? "0 1px 3px rgba(15,23,42,0.12)" : undefined,
                  }}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        <section
          aria-label="Live power flow"
          className="grid grid-cols-1 gap-3 rounded-[14px] p-3.5 sm:grid-cols-2 xl:grid-cols-4"
          style={{ background: NAVY }}
        >
          {FLOW.map((t) => (
            <div
              key={t.label}
              className="flex flex-col gap-1 rounded-xl px-4 py-3.5"
              style={{ background: t.background, color: t.colour }}
            >
              <span className="text-[13px] font-bold">{t.label}</span>
              <strong className="font-source-sans text-[30px] font-bold">
                {t.value}
              </strong>
              <span className="text-[12px] opacity-80">{t.detail}</span>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.6fr_1fr]">
          <section
            aria-label="Today's output"
            className="flex flex-col gap-3 rounded-[14px] bg-white p-[18px]"
            style={{ border: `1px solid ${BORDER}` }}
          >
            <h2 className="m-0 text-[16px] font-bold">
              Today your panels made 9% less than your roof should
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-[12px]">
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm" style={{ background: "#F68A0A" }} />
                Solar made
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm" style={{ background: "#E2E8F0" }} />
                Expected for today&rsquo;s sunshine
              </span>
            </div>

            {/* A plain CSS-grid chart: the data is sample, so a charting
                dependency would be weight without benefit. */}
            <div
              className="flex h-50 items-end gap-1.5"
              role="img"
              aria-label="Solar made today against expected output, 6 am to 7 pm"
            >
              {HOURS.map((h, i) => (
                <div key={i} className="flex h-full flex-1 flex-col justify-end">
                  <div className="relative flex h-full items-end">
                    <span
                      className="absolute bottom-0 w-full rounded-t-sm"
                      style={{ height: `${h.expected}%`, background: "#E2E8F0" }}
                    />
                    {h.made !== null ? (
                      <span
                        className="absolute bottom-0 w-full rounded-t-sm"
                        style={{ height: `${h.made}%`, background: "#F68A0A" }}
                      />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex text-[12px]" style={{ color: MUTED }}>
              {HOURS.map((h, i) => (
                <span key={i} className="flex-1 text-center">
                  {h.label}
                </span>
              ))}
            </div>
          </section>

          <div className="flex flex-col gap-4">
            <section
              aria-label="Today's totals"
              className="grid grid-cols-2 gap-3 rounded-[14px] bg-white p-[18px]"
              style={{ border: `1px solid ${BORDER}` }}
            >
              {TOTALS.map((t) => (
                <div key={t.label} className="flex flex-col gap-0.5">
                  <span className="text-[12px]" style={{ color: MUTED }}>
                    {t.label}
                  </span>
                  <strong
                    className="font-source-sans text-[22px] font-bold"
                    style={{ color: t.good ? GREEN : INK }}
                  >
                    {t.value}
                  </strong>
                </div>
              ))}
            </section>

            <section
              aria-label="AI Care agent"
              className="flex flex-col gap-2.5 rounded-[14px] p-[18px]"
              style={{ background: "#EEF7FE", border: "1px solid #9CCFF3" }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
                  style={{ background: "#0B4A7A" }}
                >
                  ✦ AI
                </span>
                <span className="grow text-[13px] font-semibold">Care agent</span>
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                  style={{ background: "#FEF3C7", color: "#92400E" }}
                >
                  Needs your OK
                </span>
              </div>
              <strong className="text-[15px]">
                Your panels look dusty. Book a drone inspection and clean?
              </strong>
              <p className="m-0 text-[13px] leading-[1.5]" style={{ color: BODY }}>
                For 7 clear days your system has made 8 to 10% less than expected,
                evenly across the roof. That usually means dust or bird droppings,
                not a fault. A clean typically brings it back.
              </p>
              <p className="m-0 text-[12px]" style={{ color: SLATE }}>
                <strong>Used:</strong> your last 14 days of data and the weather
                <br />
                <strong>Rule:</strong> You choose: we never book paid work without
                you
              </p>
              <div className="flex flex-wrap gap-2">
                {/* Inert: booking paid work is exactly what must not happen
                    from a preview with no booking system behind it. */}
                {[
                  { label: "See the offer", primary: true },
                  { label: "Edit first", primary: false },
                  { label: "Reject", primary: false, danger: true },
                ].map((b) => (
                  <span
                    key={b.label}
                    title="Not built yet — there is no drone inspection or booking system behind this page"
                    className="flex h-10 cursor-help items-center rounded-[10px] px-3.5 text-[13px] font-semibold"
                    style={
                      b.primary
                        ? { background: NAVY, color: "#FFFFFF" }
                        : {
                            border: `1px solid #CBD5E1`,
                            background: "#FFFFFF",
                            color: b.danger ? "#B91C1C" : INK,
                          }
                    }
                  >
                    {b.label}
                  </span>
                ))}
              </div>
            </section>
          </div>
        </div>

        <section
          aria-label="Your devices and data"
          className="flex flex-col gap-2 rounded-[14px] bg-white p-[18px]"
          style={{ border: `1px solid ${BORDER}` }}
        >
          <h2 className="m-0 text-[16px] font-bold">Your devices and data</h2>
          {DEVICES.map((d) => (
            <div
              key={d.name}
              className="flex flex-wrap items-center gap-2 py-2.5"
              style={{ borderBottom: `1px solid ${RULE}` }}
            >
              <span className="grow text-[14px]">{d.name}</span>
              <span className="text-[13px] font-semibold" style={{ color: GREEN }}>
                {d.state}
              </span>
            </div>
          ))}
          <span className="text-[12px]" style={{ color: SLATE }}>
            Readings would come from the FoxESS cloud every 5 minutes with your
            consent, to show this page, spot problems and run the VPP. No
            inverter is connected yet, so the figures above are a sample.{" "}
            <Link
              href="/customers/profile"
              prefetch={false}
              className="font-semibold text-[#1565C0]"
            >
              Change data sharing
            </Link>
          </span>
        </section>
      </main>
    </div>
  );
}
