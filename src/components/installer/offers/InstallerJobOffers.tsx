"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { InstallerAccountTabs } from "@/components/installer/dashboard/InstallerAccountTabs";

/**
 * Matches the Easylink Designer "Job offers" mock (JobOffers.dc.html) — the
 * installer's side of the dispatch flow: jobs EasyLink has matched to their
 * service areas, accreditations and open days.
 *
 * There is no installer-facing job offer model in this app yet. The admin
 * side has /api/admin/dispatch/offers, but nothing exposes an offer to the
 * installer who received it, and there is no payout, RCTI, crew-day or
 * accreditation-matching data behind the figures the design shows. So the
 * offers here are the mock's sample records, the same convention as the
 * Ready Sites and Ready Deals pages.
 *
 * Accepting is deliberately a preview. No job is created, no distributor is
 * notified and no customer contact is unlocked — the accepted panel says so
 * rather than claiming a dispatch that did not happen. The expiry countdowns
 * are the design's fixed strings, not live timers: a real clock here would
 * need a server-issued deadline to count down from.
 */

const money = (n: number) => "$" + Math.round(Number(n) || 0).toLocaleString("en-AU");

type Offer = {
  id: string;
  suburb: string;
  state: string;
  pc: string;
  /** Filter category, matching the design's chips. */
  kind: "solar" | "battery" | "service" | "drone";
  type: string;
  system: string;
  dist: number;
  date: string;
  /** Crew days and head count the design shows on the suggested-date tile. */
  days: string;
  crew: string;
  payout: number;
  expiry: string;
  /** Expiry urgency drives the colour: red under a few hours, then amber. */
  urgency: "red" | "amber" | "slate";
  offeredBy: string;
  competing: number;
  /** The AI assistant's reason this installer was matched. */
  why: string;
  scope: string[];
  site: string[];
  docs: string[];
};

const OFFERS: Offer[] = [
  {
    id: "JO-2207",
    suburb: "Ryde",
    state: "NSW",
    pc: "2112",
    kind: "solar",
    type: "Solar + battery",
    system: "6.6 kW · 16 × 415 W · 5 kW hybrid · 10 kWh",
    dist: 12,
    date: "Tue 21 Oct",
    days: "1.5 days",
    crew: "2 crew",
    payout: 3180,
    expiry: "Expires in 2 h 14 m",
    urgency: "red",
    offeredBy: "Harbourline Energy Pty Ltd",
    competing: 2,
    why: "You hold the battery accreditation this job needs, Ryde 2112 sits inside your service area, and you have Tue 21 Oct open with two crew. Your last four jobs in this postcode closed without a callback.",
    scope: [
      "Remove and recycle existing 2 kW system",
      "Install 16 × 415 W panels, tile roof, single storey",
      "Install 5 kW hybrid inverter and 10 kWh battery",
      "Switchboard upgrade and new isolator",
      "Commission, test and lodge the STC paperwork",
    ],
    site: ["Tile roof", "Single storey", "Meter box on side wall", "Off-street parking"],
    docs: ["Roof design", "SLD Rev A", "Switchboard photos (3)"],
  },
  {
    id: "JO-2211",
    suburb: "Ermington",
    state: "NSW",
    pc: "2115",
    kind: "battery",
    type: "Battery add-on",
    system: "10 kWh battery · existing 6.6 kW solar",
    dist: 9,
    date: "Thu 23 Oct",
    days: "1 day",
    crew: "2 crew",
    payout: 1240,
    expiry: "Expires in 9 h",
    urgency: "amber",
    offeredBy: "Harbourline Energy Pty Ltd",
    competing: 3,
    why: "Battery retrofit inside your service area with your accreditation on file. Thu 23 Oct is open on your calendar.",
    scope: [
      "Install 10 kWh battery beside existing inverter",
      "Replace inverter with 5 kW hybrid",
      "Reconfigure switchboard for backup circuit",
      "Commission and hand over the app setup",
    ],
    site: ["Garage wall mount", "Existing solar stays", "Single phase"],
    docs: ["Existing system report", "Switchboard photos (2)"],
  },
  {
    id: "JO-2213",
    suburb: "Seven Hills",
    state: "NSW",
    pc: "2147",
    kind: "service",
    type: "Service call",
    system: "Inverter fault · 6.6 kW system, 2021 install",
    dist: 21,
    date: "Mon 20 Oct",
    days: "2 hours",
    crew: "1 crew",
    payout: 260,
    expiry: "Expires in 2 days",
    urgency: "slate",
    offeredBy: "EasyLink Service Desk",
    competing: 4,
    why: "Nearest installer with a free half-day on Mon 20 Oct. The fault code matches two jobs you resolved last month.",
    scope: [
      "Diagnose inverter fault code E013",
      "Replace inverter under warranty if confirmed",
      "Test strings and restore generation",
      "Photo report back to the service desk",
    ],
    site: ["Inverter in garage", "Ladder access needed", "Dog on site"],
    docs: ["Fault report", "Original install photos"],
  },
];

const FILTERS: { key: string; label: string; test: (o: Offer) => boolean }[] = [
  { key: "all", label: "All", test: () => true },
  { key: "solar", label: "Solar", test: (o) => o.kind === "solar" },
  { key: "battery", label: "Battery", test: (o) => o.kind === "battery" },
  { key: "service", label: "Service", test: (o) => o.kind === "service" },
  { key: "drone", label: "Drone cleaning", test: (o) => o.kind === "drone" },
];

const URGENCY: Record<Offer["urgency"], string> = {
  red: "#991B1B",
  amber: "#92400E",
  slate: "#5B6B80",
};

const PILL = "rounded-full px-2.5 py-0.75 text-[11px] font-bold whitespace-nowrap";

export function InstallerJobOffers() {
  const [filter, setFilter] = useState("all");
  const [currentId, setCurrentId] = useState("JO-2207");
  const [decided, setDecided] = useState<Record<string, "accepted" | "declined" | "proposed">>({});

  const shown = useMemo(() => {
    const test = FILTERS.find((f) => f.key === filter)?.test ?? (() => true);
    return OFFERS.filter(test);
  }, [filter]);

  /** Derived during render so the selection survives a filter that hides it. */
  const selected =
    OFFERS.find((o) => o.id === currentId) ?? shown[0] ?? OFFERS[0];
  const outcome = decided[selected.id];

  return (
    <div className="flex w-full max-w-[1400px] flex-col gap-[18px]">
      <header className="flex flex-wrap items-center gap-3">
        <nav aria-label="Breadcrumb" className="mr-auto">
          <ol className="m-0 flex list-none items-center gap-1.5 p-0 text-[13px] text-[#5B6B80]">
            <li>
              <Link
                href="/installers/dashboard/overview"
                prefetch={false}
                className="text-[#5B6B80] no-underline hover:text-[#0F172A]"
              >
                Installer Account
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="font-semibold text-[#0F172A]">Job offers</li>
          </ol>
        </nav>
        <span className={`${PILL} bg-[#FEF3C7] text-[#92400E]`}>
          Respond within 4 hours to keep your priority
        </span>
      </header>

      <div className="flex flex-col gap-1">
        <h1 className="m-0 font-source-sans text-[26px] font-bold text-[#0F172A]">
          Job offers
        </h1>
        <p className="m-0 max-w-[760px] text-[14px] leading-[1.5] text-[#5B6B80]">
          Jobs EasyLink has matched to your service areas, accreditations and open
          days.
        </p>
      </div>

      <InstallerAccountTabs active="offers" />

      <div role="group" aria-label="Filter offers" className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const on = filter === f.key;
          const count = OFFERS.filter(f.test).length;
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={on}
              onClick={() => setFilter(f.key)}
              className="h-[34px] rounded-full border px-3 text-[13px] font-semibold"
              style={
                on
                  ? { background: "#0B1A2E", borderColor: "#0B1A2E", color: "#FFFFFF" }
                  : { background: "#FFFFFF", borderColor: "#CBD5E1", color: "#0F172A" }
              }
            >
              {f.label}
              {f.key === "all" ? ` · ${count}` : null}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 items-start gap-[18px] xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          {!shown.length ? (
            <p className="m-0 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px] text-[13px] text-[#5B6B80]">
              No offers in this category right now.
            </p>
          ) : null}

          {shown.map((o) => {
            const isOn = o.id === selected.id;
            const state = decided[o.id];
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setCurrentId(o.id)}
                aria-current={isOn ? "true" : undefined}
                className="flex flex-col gap-2 rounded-[14px] border bg-white p-4 text-left"
                style={
                  isOn
                    ? { borderColor: "#F68A0A", boxShadow: "0 0 0 3px rgba(246,138,10,.18)" }
                    : { borderColor: "#E3E8EF" }
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-[14px] text-[#0F172A]">
                    {o.id} · {o.suburb} {o.state} {o.pc}
                  </strong>
                  {state ? (
                    <span className={`${PILL} bg-[#E0F2FE] text-[#0B2540]`}>
                      {state === "accepted"
                        ? "Accepted (preview)"
                        : state === "declined"
                          ? "Declined"
                          : "Date proposed"}
                    </span>
                  ) : null}
                </div>
                <span className="text-[13px] font-semibold text-[#475569]">{o.type}</span>
                <span className="text-[12px] leading-[1.5] text-[#5B6B80]">{o.system}</span>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#5B6B80]">
                  <span>{o.dist} km</span>
                  <span aria-hidden>·</span>
                  <span>{o.date}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-[18px] text-[#0F172A]">{money(o.payout)}</strong>
                  <span
                    className="text-[12px] font-bold"
                    style={{ color: URGENCY[o.urgency] }}
                  >
                    {o.expiry}
                  </span>
                </div>
              </button>
            );
          })}

          <section
            aria-label="How offers work"
            className="rounded-[14px] border border-[#E3E8EF] bg-[#F8FAFC] p-4"
          >
            <h2 className="m-0 mb-2 font-source-sans text-[14px] font-bold text-[#0F172A]">
              How offers work
            </h2>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[12px] leading-[1.5] text-[#5B6B80]">
              <li>EasyLink matches jobs to your areas, accreditations and open days.</li>
              <li>Accept and the job moves to My jobs with the customer&apos;s details.</li>
              <li>Payouts are paid by RCTI after the handover pack is approved.</li>
              <li>Declining costs you nothing, but repeated no-replies lower your priority.</li>
            </ul>
          </section>
        </div>

        <section
          aria-label={`Offer ${selected.id}`}
          className="flex flex-col gap-4 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h2 className="m-0 font-source-sans text-[20px] font-bold text-[#0F172A]">
                {selected.id} · {selected.suburb} {selected.state} {selected.pc}
              </h2>
              <p className="m-0 text-[13px] text-[#5B6B80]">
                {selected.type} · {selected.system}
              </p>
            </div>
            <span
              className={`${PILL}`}
              style={
                selected.urgency === "red"
                  ? { background: "#FEE2E2", color: "#991B1B" }
                  : selected.urgency === "amber"
                    ? { background: "#FEF3C7", color: "#92400E" }
                    : { background: "#F1F5F9", color: "#5B6B80" }
              }
            >
              {selected.expiry}
            </span>
          </div>

          <div
            className="rounded-xl border p-3.5"
            style={{ background: "#EEF7FE", borderColor: "#9CCFF3" }}
          >
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <strong className="text-[13px] text-[#0B4A7A]">
                Why you got this offer
              </strong>
              <Link
                href="/installers/dashboard/ai-assistant"
                prefetch={false}
                className="text-[12px] font-semibold text-[#0B4A7A] underline"
              >
                See how EasyLink decides
              </Link>
            </div>
            <p className="m-0 text-[13px] leading-[1.55] text-[#0B2540]">{selected.why}</p>
          </div>

          <p className="m-0 text-[13px] text-[#5B6B80]">
            Offered by <strong className="text-[#0F172A]">{selected.offeredBy}</strong> via
            EasyLink · you&apos;re one of {selected.competing} installers offered this job
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                l: "Your payout",
                v: money(selected.payout),
                s: "ex GST via RCTI",
              },
              {
                l: "Suggested date",
                v: selected.date,
                s: `${selected.days} · ${selected.crew}`,
              },
              { l: "Distance", v: `${selected.dist} km`, s: "from your base" },
            ].map((t) => (
              <div
                key={t.l}
                className="flex flex-col gap-0.5 rounded-xl border border-[#E3E8EF] bg-[#F8FAFC] px-4 py-3"
              >
                <span className="text-[11px] text-[#5B6B80]">{t.l}</span>
                <strong className="text-[18px] text-[#0F172A]">{t.v}</strong>
                <span className="text-[11px] text-[#5B6B80]">{t.s}</span>
              </div>
            ))}
          </div>

          <div>
            <h3 className="m-0 mb-2 font-source-sans text-[14px] font-bold text-[#0F172A]">
              Scope
            </h3>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {selected.scope.map((s) => (
                <li
                  key={s}
                  className="flex gap-2 text-[13px] leading-[1.5] text-[#475569]"
                >
                  <span aria-hidden className="text-[#F68A0A]">
                    •
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="m-0 mb-2 font-source-sans text-[14px] font-bold text-[#0F172A]">
              Site
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {selected.site.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[12px] font-semibold text-[#475569]"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="m-0 mb-2 font-source-sans text-[14px] font-bold text-[#0F172A]">
              Documents
            </h3>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {selected.docs.map((d) => (
                <li key={d}>
                  <span
                    title="Documents unlock when you accept the job"
                    className="inline-flex cursor-default items-center gap-1.5 rounded-xl border border-[#E3E8EF] bg-white px-3 py-2 text-[13px] font-semibold text-[#475569]"
                  >
                    <span aria-hidden>📄</span>
                    {d}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p
            className="m-0 rounded-xl px-3.5 py-3 text-[13px] leading-[1.5]"
            style={{ background: "#DBEAFE", color: "#1E40AF" }}
          >
            The customer&apos;s name, address and contact details unlock when you accept
            this job.
          </p>

          {outcome ? (
            <div
              className="rounded-xl px-3.5 py-3 text-[13px] leading-[1.5]"
              style={
                outcome === "declined"
                  ? { background: "#F1F5F9", color: "#475569" }
                  : { background: "#DCFCE7", color: "#166534" }
              }
            >
              {outcome === "accepted" ? (
                <>
                  <strong>Preview only — this job was not accepted.</strong> Accepting in
                  the live portal moves {selected.id} to My jobs, unlocks the
                  customer&apos;s details and notifies {selected.offeredBy}.
                </>
              ) : outcome === "proposed" ? (
                <>
                  <strong>Preview only — no date was sent.</strong> Proposing a date in
                  the live portal asks {selected.offeredBy} to confirm an alternative to{" "}
                  {selected.date}.
                </>
              ) : (
                <>
                  <strong>Preview only — nothing was sent.</strong> Declining in the live
                  portal returns {selected.id} to EasyLink for the next installer.
                </>
              )}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setDecided((d) => ({ ...d, [selected.id]: "accepted" }))
              }
              className="h-11 rounded-xl px-5 text-[14px] font-bold text-[#3B1D00]"
              style={{ background: "#F68A0A" }}
            >
              Accept job
            </button>
            <button
              type="button"
              onClick={() =>
                setDecided((d) => ({ ...d, [selected.id]: "proposed" }))
              }
              className="h-11 rounded-xl border border-[#CBD5E1] bg-white px-5 text-[14px] font-bold text-[#0F172A]"
            >
              Propose another date
            </button>
            <button
              type="button"
              onClick={() =>
                setDecided((d) => ({ ...d, [selected.id]: "declined" }))
              }
              className="h-11 rounded-xl border border-[#CBD5E1] bg-white px-5 text-[14px] font-bold text-[#991B1B]"
            >
              Decline
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
