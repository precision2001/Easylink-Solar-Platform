"use client";

import Link from "next/link";
import { INSTALLER_PROJECT_PHASES } from "@/lib/installers/project-phase";
import type { JourneyMilestone } from "@/lib/project-journey";

/**
 * The sections the Easylink Designer "My project" mock (CustProject.dc.html)
 * adds on top of the live timeline: what the customer still has to do, the
 * four install phases, the document list, and who is responsible for what.
 *
 * The phases are derived from the customer's real milestones rather than
 * hardcoded — each milestone already carries a phase, so grouping them gives
 * the mock's four cards with true states. That is the part of this page the
 * app really knows.
 *
 * The other two sections are the mock's sample data, for different reasons:
 *
 * - "What we need from you" needs a task model with an owner and a due point.
 *   None exists, so the three items are the mock's, and "Upload bill" is inert
 *   rather than a button that appears to accept a file nothing stores.
 * - "Documents" needs per-document records. The app stores a design PDF and
 *   generates a proposal, both reachable from My design, but there is no
 *   store for a site-inspection report, CoC, STC form or warranty pack. The
 *   list shows the mock's set with only the real ones linked.
 */

const INK = "#0F172A";
const MUTED = "#5B6B80";
const SLATE = "#475569";
const BODY = "#334155";
const BORDER = "#E3E8EF";
const RULE = "#EEF2F6";
const NAVY = "#0B1A2E";
const NAVY_2 = "#13263F";
const SUN = "#F68A0A";
const SUN_INK = "#3B1D00";
const GREEN = "#166534";

/**
 * The phase order and labels come from the installer project-phase list, so
 * the customer's four cards and the installer's pipeline never drift apart.
 */
const PHASE_ORDER = INSTALLER_PROJECT_PHASES.map((p) => p.id);

const PHASE_LABEL: Record<string, string> = Object.fromEntries(
  INSTALLER_PROJECT_PHASES.map((p) => [p.id, p.label]),
);

type Phase = {
  id: string;
  label: string;
  state: "done" | "current" | "upcoming";
  steps: { label: string; state: JourneyMilestone["state"] }[];
};

/**
 * Groups the live milestones into the mock's four phase cards.
 *
 * A phase is "current" when it holds the current milestone, "done" when every
 * step in it is complete, "upcoming" otherwise — so the card headings follow
 * the real job rather than a fixed script.
 */
export function phasesFromMilestones(milestones: JourneyMilestone[]): Phase[] {
  const byPhase = new Map<string, JourneyMilestone[]>();
  for (const m of milestones) {
    const key = String(m.phase ?? PHASE_ORDER[0]);
    const list = byPhase.get(key);
    if (list) list.push(m);
    else byPhase.set(key, [m]);
  }

  // Keep the design's order for phases we know, then anything unexpected.
  const keys = [
    ...PHASE_ORDER.filter((p) => byPhase.has(p)),
    ...[...byPhase.keys()].filter(
      (k) => !PHASE_ORDER.includes(k as (typeof PHASE_ORDER)[number]),
    ),
  ];

  return keys.map((key) => {
    const steps = byPhase.get(key) ?? [];
    const hasCurrent = steps.some((s) => s.state === "current");
    const allDone = steps.length > 0 && steps.every((s) => s.state === "completed");
    return {
      id: key,
      label: PHASE_LABEL[key] ?? key.replace(/_/g, " "),
      state: hasCurrent ? "current" : allDone ? "done" : "upcoming",
      steps: steps.map((s) => ({ label: s.label, state: s.state })),
    };
  });
}

const STATE_LABEL: Record<Phase["state"], string> = {
  done: "Done",
  current: "In progress",
  upcoming: "Not started",
};

export function ProjectPhaseCards({ phases }: { phases: Phase[] }) {
  if (phases.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {phases.map((p, i) => (
        <section
          key={p.id}
          aria-label={p.label}
          className="flex flex-col gap-2 rounded-[14px] bg-white p-3.5"
          style={{
            border: `1px solid ${BORDER}`,
            borderTop: `4px solid ${p.state === "current" ? SUN : BORDER}`,
          }}
        >
          <span
            className="text-[11px] font-bold tracking-[0.06em] uppercase"
            style={{ color: MUTED }}
          >
            {i + 1} · {p.label}
          </span>
          <strong className="text-[15px]">{STATE_LABEL[p.state]}</strong>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13px]">
            {p.steps.map((s) => {
              const done = s.state === "completed";
              const now = s.state === "current";
              return (
                <li
                  key={s.label}
                  className="flex items-start gap-2"
                  style={{ color: done ? GREEN : now ? "#B45309" : SLATE }}
                >
                  <span aria-hidden className="leading-[1.4]">
                    {done ? "✓" : now ? "•" : "○"}
                  </span>
                  <span>{s.label}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * The navy "What we need from you" panel.
 *
 * Sample data: nothing models a customer task. The upload is inert rather
 * than a control that looks like it accepted a bill nothing keeps.
 */
export function WhatWeNeedPanel() {
  const items: { title: string; detail: string; action: string; primary?: boolean }[] =
    [
      {
        title: "Upload a recent power bill",
        detail: "So your installer can size your battery and work out your savings",
        action: "Upload bill",
        primary: true,
      },
      {
        title: "Choose your design and accept the proposal",
        detail: "After your walkthrough",
        action: "After the walkthrough",
      },
      {
        title: "Sign the STC assignment form",
        detail:
          "Lets your installer claim the solar, battery and hot water rebates on your behalf",
        action: "On install day",
      },
    ];

  return (
    <section
      aria-label="What we need from you"
      className="flex flex-col gap-2.5 rounded-[14px] p-[18px]"
      style={{ background: NAVY, color: "#FFFFFF" }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="m-0 grow text-[16px] font-bold">What we need from you</h2>
        <span
          title="No customer task list exists in this app yet — these three are from the design mock"
          className="cursor-help rounded-full px-2.5 py-0.75 text-[11px] font-bold"
          style={{ background: "#2A4466", color: "#E6EDF7" }}
        >
          Sample data
        </span>
      </div>
      {items.map((it) => (
        <div
          key={it.title}
          className="flex flex-wrap items-center gap-3 rounded-xl px-3.5 py-3"
          style={{ background: NAVY_2 }}
        >
          <span className="min-w-50 grow">
            <span className="block text-[14px] font-semibold">{it.title}</span>
            <span className="block text-[12px]" style={{ color: "#C3CFDF" }}>
              {it.detail}
            </span>
          </span>
          {it.primary ? (
            <span
              title="Not built yet — there is nowhere to store an uploaded bill against your project"
              className="flex h-10 cursor-help items-center rounded-[10px] px-3.5 text-[13px] font-bold"
              style={{ background: SUN, color: SUN_INK }}
            >
              {it.action}
            </span>
          ) : (
            <span className="text-[13px] font-semibold" style={{ color: "#9FB0C8" }}>
              {it.action}
            </span>
          )}
        </div>
      ))}
    </section>
  );
}

/**
 * The document list. Only the two this app really produces are links; the
 * rest show when they will appear rather than pretending to exist.
 */
export function ProjectDocuments({ designHref }: { designHref: string | null }) {
  const docs: { name: string; detail: string; href?: string }[] = [
    {
      name: "Design PDF and proposal",
      detail: designHref
        ? "View or download from My design"
        : "Once you have a saved design",
      ...(designHref ? { href: designHref } : {}),
    },
    { name: "Site inspection report", detail: "After your site visit" },
    { name: "Proposal and contract", detail: "After your walkthrough" },
    { name: "STC assignment form", detail: "To sign on install day" },
    { name: "Certificate of Compliance (CCEW)", detail: "After installation" },
    {
      name: "Warranties: panels, inverter, battery, workmanship",
      detail: "In your handover pack",
    },
    { name: "Handover pack and guides", detail: "Sent when the job is complete" },
  ];

  return (
    <section
      aria-label="Documents"
      className="flex flex-col gap-1 rounded-[14px] bg-white p-[18px]"
      style={{ border: `1px solid ${BORDER}` }}
    >
      <h2 className="m-0 mb-1 text-[16px] font-bold">Documents</h2>
      {docs.map((d) => (
        <div
          key={d.name}
          className="flex flex-wrap items-center gap-2 py-2.5"
          style={{ borderBottom: `1px solid ${RULE}` }}
        >
          <span className="min-w-50 grow">
            <span
              className="block text-[14px] font-semibold"
              style={{ color: d.href ? INK : SLATE }}
            >
              {d.name}
            </span>
            <span className="block text-[12px]" style={{ color: MUTED }}>
              {d.detail}
            </span>
          </span>
          {d.href ? (
            <Link
              href={d.href}
              prefetch={false}
              className="text-[13px] font-semibold text-[#1565C0]"
            >
              Open
            </Link>
          ) : null}
        </div>
      ))}
      <span className="pt-1 text-[12px]" style={{ color: SLATE }}>
        Only your design and proposal are stored today. The rest appear here as
        your installer and EasyLink produce them.
      </span>
    </section>
  );
}

/** Who does what — fixed copy in the design, and true of the business. */
export function WhoDoesWhat() {
  const roles: { who: string; what: string }[] = [
    {
      who: "Your installer",
      what: "Designs, installs, tests and hands over your system",
    },
    {
      who: "EasyLink",
      what: "Runs this portal, checks your installer's paperwork and lodges your rebates",
    },
    { who: "Your network", what: "Approves the connection and export limit" },
    { who: "Your retailer", what: "Changes your meter and sets your feed-in tariff" },
  ];

  return (
    <section
      aria-label="Who does what"
      className="flex flex-col gap-1 rounded-[14px] bg-white p-[18px]"
      style={{ border: `1px solid ${BORDER}` }}
    >
      <h2 className="m-0 mb-1 text-[16px] font-bold">Who does what</h2>
      {roles.map((r) => (
        <div
          key={r.who}
          className="flex flex-wrap gap-x-4 gap-y-1 py-2.5"
          style={{ borderBottom: `1px solid ${RULE}` }}
        >
          <strong className="w-35 text-[14px]">{r.who}</strong>
          <span className="min-w-50 flex-1 text-[13px]" style={{ color: BODY }}>
            {r.what}
          </span>
        </div>
      ))}
    </section>
  );
}
