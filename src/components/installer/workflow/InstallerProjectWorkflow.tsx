"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { useInstallerCustomers } from "@/components/installer/dashboard/InstallerCustomersProvider";
import { useInstallerHomePanel } from "@/hooks/useInstallerHomePanel";
import { useInstallerProjectJourney } from "@/hooks/useInstallerProjectJourney";
import {
  formatMilestoneDate,
  setInstallerCurrentMilestone,
  type JourneyMilestone,
} from "@/lib/project-journey";
import {
  INSTALLER_PROJECT_PHASES,
  type InstallerProjectPhaseId,
} from "@/lib/installers/project-phase";
import {
  batteryCapacityKwh,
  inverterRatedKw,
  productLabel,
  productsByCategory,
  systemSizeKwFrom,
} from "@/lib/designs/product-specs";

/**
 * Project workflow, matching the Easylink Designer artboard
 * (ProjectWorkflow.dc.html): four phase tabs over the steps of the selected
 * phase, with a summary of the system underneath.
 *
 * The artboard draws each step as a free-standing checkbox. The journey this
 * runs on models progress as one pointer — the current milestone, with
 * everything before it complete — so a step is a button that moves the
 * project to it rather than a box that toggles alone. Ticking step five
 * therefore completes one to four, which is what the backend records; an
 * independent tick per row would have nowhere to be saved.
 */

const PHASE_SHORT: Record<InstallerProjectPhaseId, string> = {
  DESIGN_AND_PERMISSIONS: "1 · Design & permissions",
  INSTALLATION: "2 · Pre & post installation",
  COMMISSIONING: "3 · Commissioning",
  MAINTENANCE_AND_MONITORING: "4 · Maintenance & monitoring",
};

function StepRow({
  milestone,
  busy,
  onPick,
}: {
  milestone: JourneyMilestone;
  busy: boolean;
  onPick: () => void;
}) {
  const done = milestone.state === "completed";
  const current = milestone.state === "current";
  const at = formatMilestoneDate(milestone.completedAt);

  return (
    <button
      type="button"
      onClick={onPick}
      disabled={busy}
      aria-pressed={current}
      className="flex min-h-11 w-full items-center gap-3 border-b border-[#EEF2F6] py-2 text-left last:border-0 disabled:opacity-60"
    >
      <span
        aria-hidden
        className="flex size-5 shrink-0 items-center justify-center rounded-[5px] border text-[13px] font-bold"
        style={
          done
            ? { background: "#F68A0A", borderColor: "#F68A0A", color: "#3B1D00" }
            : current
              ? { borderColor: "#F68A0A", color: "#F68A0A" }
              : { borderColor: "#CBD5E1", color: "transparent" }
        }
      >
        {done ? "✓" : current ? "•" : ""}
      </span>
      <span className="flex min-w-0 flex-grow flex-col">
        <span className="text-[14px] font-semibold text-[#0F172A]">
          {milestone.label}
        </span>
        {milestone.hint ? (
          <span className="text-[12px] text-[#5B6B80]">{milestone.hint}</span>
        ) : null}
      </span>
      {current ? (
        <span className="shrink-0 rounded-full bg-[#FFE7C2] px-2 py-0.5 text-[11px] font-bold text-[#3B1D00]">
          Current
        </span>
      ) : at ? (
        <span className="shrink-0 text-[12px] text-[#5B6B80]">{at}</span>
      ) : null}
    </button>
  );
}

function SummaryBlock({
  heading,
  rows,
}: {
  heading: string;
  rows: { k: string; v: string }[];
}) {
  if (!rows.length) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="m-0 text-[12px] font-bold uppercase tracking-[0.06em] text-[#475569]">
        {heading}
      </h3>
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1 text-[13px]">
        {rows.map((r) => (
          <div key={r.k} className="contents">
            <dt className="text-[#5B6B80]">{r.k}</dt>
            <dd className="m-0 font-semibold text-[#0F172A]">{r.v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function InstallerProjectWorkflow() {
  const params = useSearchParams();
  const customerId = params.get("customerId");
  const { customers } = useInstallerCustomers();

  const panel = useInstallerHomePanel(customerId);
  const leadId = panel.lead?.id ?? null;
  const journeyState = useInstallerProjectJourney(leadId);
  const journey = journeyState.journey;

  const [phaseIndex, setPhaseIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const activePhase = phaseIndex ?? journey?.phaseIndex ?? 0;

  const byPhase = useMemo(() => {
    const map = new Map<InstallerProjectPhaseId, JourneyMilestone[]>();
    for (const phase of INSTALLER_PROJECT_PHASES) map.set(phase.id, []);
    for (const m of journey?.milestones ?? []) {
      map.get(m.phase)?.push(m);
    }
    return map;
  }, [journey]);

  const design = panel.design;
  const panelItem = productsByCategory(design?.products, "panel")[0];
  const inverterItem = productsByCategory(design?.products, "inverter")[0];
  const batteryItem = productsByCategory(design?.products, "batter")[0];
  const systemKw = systemSizeKwFrom(panelItem, design?.panelCount);
  const batteryKwh = batteryCapacityKwh(batteryItem);
  const inverterKw = inverterRatedKw(inverterItem);

  const customer = panel.customer;
  const customerName = customer
    ? `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() ||
      customer.email ||
      "Customer"
    : "Customer";

  const pickMilestone = async (key: string) => {
    if (!leadId || busy || key === journey?.currentMilestoneKey) return;
    setBusy(true);
    try {
      journeyState.setJourney(await setInstallerCurrentMilestone(leadId, key));
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not update the project step",
      );
    } finally {
      setBusy(false);
    }
  };

  if (!customerId) {
    return (
      <div className="rounded-[14px] border border-[#E3E8EF] bg-white p-6">
        <h1 className="m-0 font-source-sans text-[22px] font-bold text-[#0F172A]">
          Project workflow
        </h1>
        <p className="mt-2 text-[13px] text-[#5B6B80]">
          Pick a customer to see their project workflow.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {customers.slice(0, 12).map((c) => (
            <Link
              key={c.id}
              href={`/installers/dashboard/project-workflow?customerId=${c.id}`}
              className="rounded-[9px] border border-[#CBD5E1] bg-white px-3 py-2 text-[13px] font-semibold text-[#0F172A] no-underline"
            >
              {`${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() ||
                c.email ||
                "Customer"}
            </Link>
          ))}
          {!customers.length ? (
            <span className="text-[13px] text-[#5B6B80]">
              No customers yet.
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[1400px] flex-col gap-4">
      <nav
        aria-label="Customer views"
        className="flex flex-wrap gap-1 self-start rounded-xl border border-[#E3E8EF] bg-white p-1"
      >
        <Link
          href="/installers/dashboard/customers"
          className="flex h-[38px] items-center rounded-[9px] px-3.5 text-[13px] font-semibold text-[#475569] no-underline"
        >
          Customer detail
        </Link>
        <span
          aria-current="page"
          className="flex h-[38px] items-center rounded-[9px] bg-[#FFF7E6] px-3.5 text-[13px] font-bold text-[#3B1D00]"
        >
          Project workflow
        </span>
        <Link
          href="/installers/dashboard/pipeline-status"
          className="flex h-[38px] items-center rounded-[9px] px-3.5 text-[13px] font-semibold text-[#475569] no-underline"
        >
          Pipeline status
        </Link>
      </nav>

      <div>
        <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
          {customerName}
          {systemKw ? ` · ${systemKw.toFixed(2)} kW` : ""}
          {batteryKwh ? ` + ${batteryKwh} kWh` : ""}
        </h1>
        <p className="mt-1 text-[13px] text-[#5B6B80]">
          {[
            customer?.address,
            panel.lead?.status ? `status ${panel.lead.status}` : null,
            journey
              ? `${journey.completedCount} of ${journey.totalCount} steps done`
              : null,
          ]
            .filter(Boolean)
            .join(" · ") || "No project details yet."}
        </p>
      </div>

      {panel.loading || journeyState.loading ? (
        <div className="h-[320px] animate-pulse rounded-[14px] bg-cream-150" />
      ) : journeyState.error || !journey ? (
        <div className="rounded-[14px] border border-[#E3E8EF] bg-white p-6 text-[13px] text-[#5B6B80]">
          {journeyState.error ??
            (leadId
              ? "No project milestones for this customer yet."
              : "This customer has no lead, so there is no project workflow yet.")}
        </div>
      ) : (
        <>
          <div
            role="tablist"
            aria-label="Project phases"
            className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
          >
            {INSTALLER_PROJECT_PHASES.map((phase, i) => {
              const steps = byPhase.get(phase.id) ?? [];
              const done = steps.filter((s) => s.state === "completed").length;
              const selected = i === activePhase;
              const pct = steps.length
                ? Math.round((done / steps.length) * 100)
                : 0;
              return (
                <button
                  key={phase.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setPhaseIndex(i)}
                  className="flex flex-col gap-1.5 rounded-xl border-2 p-3 text-left"
                  style={
                    selected
                      ? {
                          background: "#0B1A2E",
                          borderColor: "#0B1A2E",
                          color: "#FFFFFF",
                        }
                      : {
                          background: "#FFFFFF",
                          borderColor: "#E3E8EF",
                          color: "#0F172A",
                        }
                  }
                >
                  <span className="text-[11px] font-bold uppercase tracking-[0.06em]">
                    {PHASE_SHORT[phase.id]}
                  </span>
                  <span className="text-[14px] font-semibold">
                    {done} of {steps.length} done
                  </span>
                  <span
                    className="h-1.5 overflow-hidden rounded-full"
                    style={{ background: selected ? "#1B3557" : "#E2E8F0" }}
                  >
                    <span
                      className="block h-full bg-[#F68A0A]"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                </button>
              );
            })}
          </div>

          <section className="flex flex-col gap-1.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]">
            <h2 className="m-0 mb-1.5 text-[16px] font-bold text-[#0F172A]">
              {PHASE_SHORT[
                INSTALLER_PROJECT_PHASES[activePhase]?.id ??
                  "DESIGN_AND_PERMISSIONS"
              ]}
            </h2>
            {(
              byPhase.get(
                INSTALLER_PROJECT_PHASES[activePhase]?.id ??
                  "DESIGN_AND_PERMISSIONS",
              ) ?? []
            ).map((m) => (
              <StepRow
                key={m.key}
                milestone={m}
                busy={busy}
                onPick={() => void pickMilestone(m.key)}
              />
            ))}
            {!(byPhase.get(INSTALLER_PROJECT_PHASES[activePhase]?.id ?? "DESIGN_AND_PERMISSIONS") ?? [])
              .length ? (
              <p className="m-0 text-[13px] text-[#5B6B80]">
                No steps in this phase.
              </p>
            ) : null}
            <p className="m-0 mt-1.5 text-[12px] text-[#475569]">
              Pick a step to move the project to it — earlier steps are recorded
              as done.
            </p>
          </section>
        </>
      )}

      <section className="grid gap-[18px] rounded-[14px] border border-[#E3E8EF] bg-white p-[18px] sm:grid-cols-2 lg:grid-cols-4">
        <SummaryBlock
          heading="Solar system"
          rows={[
            ...(systemKw ? [{ k: "Size", v: `${systemKw.toFixed(2)} kW DC` }] : []),
            ...(design?.panelCount
              ? [{ k: "Panels", v: String(design.panelCount) }]
              : []),
            ...(productLabel(panelItem)
              ? [{ k: "Panel", v: productLabel(panelItem)! }]
              : []),
          ]}
        />
        <SummaryBlock
          heading="Battery & inverter"
          rows={[
            ...(batteryKwh ? [{ k: "Battery", v: `${batteryKwh} kWh` }] : []),
            ...(productLabel(batteryItem)
              ? [{ k: "Model", v: productLabel(batteryItem)! }]
              : []),
            ...(inverterKw ? [{ k: "Inverter", v: `${inverterKw} kW` }] : []),
            ...(productLabel(inverterItem)
              ? [{ k: "Model", v: productLabel(inverterItem)! }]
              : []),
          ]}
        />
        <SummaryBlock
          heading="Customer"
          rows={[
            { k: "Name", v: customerName },
            ...(customer?.phone ? [{ k: "Phone", v: customer.phone }] : []),
            ...(customer?.email ? [{ k: "Email", v: customer.email }] : []),
            ...(customer?.homeProfile?.customerType
              ? [{ k: "Type", v: customer.homeProfile.customerType }]
              : []),
          ]}
        />
        <SummaryBlock
          heading="Price & margin"
          rows={[
            ...(typeof customer?.homeProfile?.salePrice === "number"
              ? [
                  {
                    k: "Sale price",
                    v: new Intl.NumberFormat("en-AU", {
                      style: "currency",
                      currency: "AUD",
                      maximumFractionDigits: 0,
                    }).format(customer.homeProfile.salePrice),
                  },
                ]
              : []),
            ...(typeof customer?.homeProfile?.profit === "number"
              ? [
                  {
                    k: "Profit",
                    v: new Intl.NumberFormat("en-AU", {
                      style: "currency",
                      currency: "AUD",
                      maximumFractionDigits: 0,
                    }).format(customer.homeProfile.profit),
                  },
                ]
              : []),
          ]}
        />
      </section>
    </div>
  );
}
