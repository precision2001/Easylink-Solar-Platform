"use client";

import { useState } from "react";
import Link from "next/link";
import { CustomerTopNav } from "@/components/customer/portal/CustomerTopNav";

/**
 * Matches the Easylink Designer "Customer home" mock (CustHome.dc.html) — the
 * solar journey bar, the live/AI strip, four headline figures, the design
 * options grid, and the installer and timeline column.
 *
 * The figures here are the mock's sample data, as asked. Three parts of this
 * page have no source in this app at all and could not be live even in
 * principle today:
 *
 * - The LIVE tile (solar kW, battery %, exporting kW) needs inverter
 *   telemetry. There is no endpoint, model or stored reading for it.
 * - The AI · Care note needs a drone inspection report.
 * - "4.7 ★ from 38 customers" needs an installer review model.
 *
 * The rest — designs, journey, timeline — does have live equivalents, which
 * the working dashboard at /customers/overview uses. A "Sample data" marker in
 * the header says plainly that what is shown is not the viewer's own system,
 * and the header links to that live page so the real data stays one click
 * away.
 *
 * Selecting an option is local to the page: it moves the ring and updates the
 * four figures, exactly as the mock does, but saves nothing. The live page is
 * where a choice is actually recorded against the customer's account.
 */

const SUN_INK = "#3B1D00";
const INK = "#0F172A";
const MUTED = "#5B6B80";
const SLATE = "#475569";
const BODY = "#334155";
const BORDER = "#E3E8EF";

type Option = {
  name: string;
  kw: number;
  panels: number;
  extra: string;
  tag: string;
  tagBg: string;
  tagFg: string;
  /** Shown above the grid when this option is the selected one. */
  warn?: string;
};

/** Annual output, as the mock derives it: kW × 1460, rounded to 10 kWh. */
function annualOutput(kw: number): number {
  return Math.round((kw * 1460) / 10) * 10;
}

const OPTIONS: Option[] = [
  {
    name: "Starter",
    kw: 6.6,
    panels: 15,
    extra: " · 5 kW inverter",
    tag: "Draft",
    tagBg: "#E2E8F0",
    tagFg: BODY,
  },
  {
    name: "Recommended",
    kw: 12.76,
    panels: 29,
    extra: " · 32.6 kWh battery",
    tag: "Suggested by Solarman",
    tagBg: "#DCFCE7",
    tagFg: "#166534",
  },
  {
    name: "Solar + EV",
    kw: 12.76,
    panels: 29,
    extra: " · zappi EV charger",
    tag: "Draft",
    tagBg: "#E2E8F0",
    tagFg: BODY,
  },
  {
    name: "Custom",
    kw: 14.52,
    panels: 33,
    extra: " · battery, EV, heat pump",
    tag: "Needs a change",
    tagBg: "#FEF3C7",
    tagFg: "#92400E",
    warn: "Your custom design is 147% of the inverter size. Rebate (STC) rules allow 133%, so Solarman suggests the Recommended option with 29 panels.",
  },
];

const JOURNEY = [
  "Enquiry",
  "Site visit booked",
  "Site inspection",
  "Design",
  "Proposal",
  "Deposit",
  "Installation",
  "Switched on",
];

/** Steps completed; the one at this index is current. */
const DONE = 3;

const TIMELINE: { title: string; detail: string; colour: string }[] = [
  {
    title: "Proposal walkthrough",
    detail: "Thu 16 Oct · 5:30 pm · video call",
    colour: "#1976D2",
  },
  {
    title: "EV charger added to your design",
    detail: "10 Oct · from your message",
    colour: "#166534",
  },
  {
    title: "Site inspection done",
    detail: "Sat 10 Oct · 10:10 am",
    colour: "#166534",
  },
  { title: "Enquiry received", detail: "3 Oct · website", colour: "#166534" },
];

export function CustomerHome() {
  /** The mock opens on Custom, which is the option carrying the warning. */
  const [selected, setSelected] = useState(3);
  const design = OPTIONS[selected]!;
  const output = annualOutput(design.kw);

  const kpis = [
    {
      label: "System size",
      value: `${design.kw} kW`,
      sub: `${design.panels} panels`,
    },
    {
      label: "Annual output",
      value: `≈ ${output.toLocaleString("en-AU")} kWh`,
      sub: "Estimate for Yagoona",
    },
    {
      label: "Est. savings",
      value: "$[X]/yr",
      sub: "Upload a power bill to calculate",
    },
    {
      label: "Total price",
      value: "$[price]",
      sub: "In your proposal · after rebates",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6FA]" style={{ color: INK }}>
      <CustomerTopNav active="dashboard" />

      <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-[18px] px-6 pt-6 pb-14">
        <div className="flex flex-wrap items-center gap-2">
          <span
            title="The figures on this page are from the design mock, not your own system"
            className="cursor-help rounded-full px-2.5 py-0.75 text-[12px] font-bold"
            style={{ background: "#DBEAFE", color: "#1E40AF" }}
          >
            Sample data
          </span>
          <Link
            href="/customers/overview"
            prefetch={false}
            className="text-[13px] font-semibold text-[#1565C0]"
          >
            Open my real dashboard
          </Link>
        </div>

        <section
          aria-label="Your solar journey"
          className="flex flex-col gap-4 rounded-2xl p-[22px]"
          style={{
            background: "linear-gradient(90deg, #FFE866, #F68A0A)",
            color: SUN_INK,
          }}
        >
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex min-w-70 flex-1 flex-col gap-1">
              <h1 className="m-0 font-source-sans text-[30px] font-bold">
                Welcome back, Daniel
              </h1>
              <span className="text-[14px]">
                Your solar journey is {Math.round((DONE / 8) * 100)}% complete ·{" "}
                {DONE} of 8 steps done
              </span>
            </div>
            <div className="flex flex-wrap gap-6">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-bold tracking-[0.06em] uppercase">
                  Selected design
                </span>
                <strong className="text-[16px]">
                  {design.name} · {design.kw} kW
                </strong>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-bold tracking-[0.06em] uppercase">
                  Next step
                </span>
                <strong className="text-[16px]">
                  Proposal walkthrough · Thu 16 Oct
                </strong>
              </div>
            </div>
          </div>

          <ol
            aria-label="Journey"
            className="m-0 grid list-none grid-cols-4 gap-1.5 p-0 md:grid-cols-8"
          >
            {JOURNEY.map((step, i) => (
              <li key={step} className="flex flex-col gap-1.5">
                <span
                  className="h-1.5 rounded-full"
                  style={{
                    background:
                      i < DONE
                        ? SUN_INK
                        : i === DONE
                          ? "#FFFFFF"
                          : "rgba(59,29,0,0.2)",
                  }}
                />
                <span
                  className="text-[12px]"
                  style={{ fontWeight: i === DONE ? 700 : 500 }}
                >
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          {/* Inert: the Energy page it points at isn't built, because nothing
              in this app reads an inverter. */}
          <div
            aria-disabled="true"
            title="Not built yet — this needs live inverter data, which isn't connected"
            className="flex cursor-help flex-col gap-1 rounded-[14px] px-[18px] py-4 text-white"
            style={{ background: "#0B1A2E" }}
          >
            <span className="text-[12px] font-bold text-[#FFE866]">LIVE</span>
            <strong className="text-[18px]">
              Solar 5.8 kW · Battery 72% · Exporting 1.8 kW
            </strong>
            <span className="text-[13px] text-[#C3CFDF]">See my energy</span>
          </div>

          <div
            className="flex flex-col gap-2 rounded-[14px] px-[18px] py-4"
            style={{ background: "#EEF7FE", border: "1px solid #9CCFF3" }}
          >
            <span
              className="w-fit rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
              style={{ background: "#0B4A7A" }}
            >
              AI · Care
            </span>
            <strong className="text-[15px]">
              Your panels look dusty: about 7% of your solar lost
            </strong>
            <span className="text-[13px]">
              A drone inspection found 7 dusty panels and one warranty issue
              we&rsquo;ve already claimed.{" "}
              {/* No drone report model exists, so this reads as text. */}
              <span title="Not built yet" className="cursor-help underline">
                See the report
              </span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="flex flex-col gap-1 rounded-[14px] bg-white p-4"
              style={{ border: `1px solid ${BORDER}` }}
            >
              <span
                className="text-[12px] font-semibold"
                style={{ color: MUTED }}
              >
                {k.label}
              </span>
              <span className="font-source-sans text-[28px] font-bold">
                {k.value}
              </span>
              <span className="text-[12px]" style={{ color: SLATE }}>
                {k.sub}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-start gap-4">
          <section
            aria-label="Your system designs"
            className="flex min-w-0 flex-[2_1_560px] flex-col gap-3 rounded-[14px] bg-white p-[18px]"
            style={{ border: `1px solid ${BORDER}` }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="m-0 grow text-[16px] font-bold">
                Your system designs
              </h2>
              <span className="text-[12px]" style={{ color: MUTED }}>
                4 options from Solarman · tap one to select
              </span>
            </div>

            {design.warn ? (
              <p
                role="status"
                className="m-0 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold"
                style={{ background: "#FFFBEB", color: "#92400E" }}
              >
                {design.warn}
              </p>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {OPTIONS.map((o, i) => {
                const on = i === selected;
                return (
                  <button
                    key={o.name}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSelected(i)}
                    className="flex cursor-pointer flex-col overflow-hidden rounded-[14px] bg-white p-0 text-left"
                    style={{
                      border: `2px solid ${on ? "#F68A0A" : BORDER}`,
                    }}
                  >
                    <span
                      role="img"
                      aria-label="Roof layout placeholder"
                      className="flex h-22 items-start justify-between p-2.5 text-[12px]"
                      style={{ background: "#1E3A5F", color: "#C3CFDF" }}
                    >
                      <span>Roof layout</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                        style={{ background: o.tagBg, color: o.tagFg }}
                      >
                        {o.tag}
                      </span>
                    </span>
                    <span className="flex flex-col gap-1 p-3">
                      <strong className="text-[15px]">{o.name}</strong>
                      <span className="text-[13px]" style={{ color: BODY }}>
                        {o.kw} kW · {o.panels} panels{o.extra}
                      </span>
                      <span className="text-[12px]" style={{ color: MUTED }}>
                        ≈ {annualOutput(o.kw).toLocaleString("en-AU")} kWh/yr ·
                        $[price] after proposal
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/customers/design"
                prefetch={false}
                className="text-[13px] font-semibold text-[#1565C0]"
              >
                Compare all designs
              </Link>
              <Link
                href="/designs"
                prefetch={false}
                className="text-[13px] font-semibold text-[#1565C0]"
              >
                Open the solar designer
              </Link>
            </div>
            <span className="text-[12px]" style={{ color: SLATE }}>
              Choosing here is a preview — it changes the figures above but
              saves nothing. Your real selection lives on your dashboard.
            </span>
          </section>

          <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
            <section
              aria-label="Your installer"
              className="flex flex-col gap-2.5 rounded-[14px] p-[18px] text-white"
              style={{ background: "#0B1A2E" }}
            >
              <span className="text-[11px] font-bold tracking-[0.08em] text-[#9FB0C8] uppercase">
                Your installer
              </span>
              <div className="flex items-center gap-3">
                <span
                  className="flex size-11 items-center justify-center rounded-full font-bold"
                  style={{ background: "#F68A0A", color: SUN_INK }}
                >
                  S
                </span>
                <span className="flex grow flex-col">
                  <strong className="text-[16px]">Solarman</strong>
                  <span className="text-[12px] text-[#C3CFDF]">
                    SAA accredited · 4.7 ★ from 38 customers
                  </span>
                </span>
              </div>
              <Link
                href="/customers/messages"
                prefetch={false}
                className="flex h-11 items-center justify-center rounded-[10px] text-[14px] font-bold no-underline"
                style={{ background: "#F68A0A", color: SUN_INK }}
              >
                Message Solarman
              </Link>
            </section>

            <section
              aria-label="Project timeline"
              className="flex flex-col gap-2 rounded-[14px] bg-white p-[18px]"
              style={{ border: `1px solid ${BORDER}` }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="m-0 grow text-[16px] font-bold">
                  Project timeline
                </h2>
                <Link
                  href="/customers/project"
                  prefetch={false}
                  className="text-[13px] font-semibold text-[#1565C0]"
                >
                  My project
                </Link>
              </div>
              {TIMELINE.map((t) => (
                <div key={t.title} className="flex gap-2.5 py-1.5">
                  <span
                    className="mt-1 size-2.5 shrink-0 rounded-full"
                    style={{ background: t.colour }}
                  />
                  <span className="flex flex-col">
                    <span className="text-[14px] font-semibold">{t.title}</span>
                    <span className="text-[12px]" style={{ color: MUTED }}>
                      {t.detail}
                    </span>
                  </span>
                </div>
              ))}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
