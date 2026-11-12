"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { askEasylinkAi } from "@/components/ai-chat/EasylinkAiChatbot";
import { CustomerPortalShell, PortalPageHeader } from "@/components/customer/portal/CustomerPortalShell";
import { PortalIcon } from "@/components/customer/portal/PortalIcon";
import { ButtonLink, EmptyNote, JourneySteps, Panel, Skeleton, Stat } from "@/components/customer/portal/PortalParts";
import { DesignChoices } from "@/components/customer/portal/DesignChoices";
import { useCustomerProjectJourney } from "@/components/customer/dashboard/useCustomerProjectJourney";
import { fetchDesignOptions, formatOptionPrice, selectDesignOption, type DesignOptions } from "@/lib/customers/design-options";
import { EMPTY_VALUE, selectedDesignOption } from "@/lib/customers/dashboard-summary";
import { insightsFor, nextBestStep } from "@/lib/customers/next-best-step";
import { useAppSelector } from "@/lib/store/hooks";

/** Before a project exists, show where the customer is in the buying journey. */
const PRE_PROJECT_STEPS = [
  { key: "design", label: "Design my system" },
  { key: "choose", label: "Choose an option" },
  { key: "call", label: "Advisor call" },
  { key: "visit", label: "Site visit" },
  { key: "install", label: "Installation" },
  { key: "live", label: "Switch on" },
];

function greeting(now = new Date()): string {
  const h = Number(now.toLocaleString("en-AU", { hour: "numeric", hour12: false, timeZone: "Australia/Sydney" }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function CustomerDashboardPage() {
  const user = useAppSelector((s) => s.customerAuth.user);
  const [options, setOptions] = useState<DesignOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const { journey, loading: journeyLoading } = useCustomerProjectJourney();

  useEffect(() => {
    let live = true;
    fetchDesignOptions()
      .then((d) => live && setOptions(d))
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not load your designs"))
      .finally(() => live && setOptionsLoading(false));
    return () => {
      live = false;
    };
  }, []);

  async function choose(key: string) {
    if (savingKey) return;
    setSavingKey(key);
    try {
      setOptions(await selectDesignOption(key));
      toast.success("Saved. That's your selected system.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your choice");
    } finally {
      setSavingKey(null);
    }
  }

  const design = selectedDesignOption(options);
  const loading = optionsLoading || journeyLoading;
  const step = useMemo(() => nextBestStep({ journey, options }), [journey, options]);
  const insights = useMemo(() => insightsFor(options), [options]);

  const steps = useMemo(() => {
    if (journey?.milestones.length) return journey.milestones;
    const reached = !options?.hasCompletedDesignWizard && !design ? 0 : design ? 2 : 1;
    return PRE_PROJECT_STEPS.map((s, i) => ({
      ...s,
      completedAt: null,
      state: (i < reached ? "completed" : i === reached ? "current" : "upcoming") as "completed" | "current" | "upcoming",
    }));
  }, [journey, options, design]);

  const price = design ? (design.priceAfterStc && design.priceAfterStc > 0 ? design.priceAfterStc : design.price) : 0;
  const pct = journey ? Math.round(Math.max(0, Math.min(100, journey.percentComplete))) : null;

  return (
    <CustomerPortalShell active="dashboard">
      <PortalPageHeader
        eyebrow={pct !== null ? `Your solar journey is ${pct}% complete` : "Your solar portal"}
        title={`${greeting()}${user?.firstName ? `, ${user.firstName}` : ""}`}
      />

      <Panel title="Your solar journey" meta="Every step explained. We update it as your job moves.">
        {loading ? <Skeleton className="h-[84px]" /> : <JourneySteps milestones={steps} />}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        {/* The one bold thing on the page: what to do next. */}
        <section aria-labelledby="next-step" className="relative flex flex-col gap-4 overflow-hidden rounded-[22px] bg-[#0B1A2E] p-6 text-white sm:p-7">
          <svg aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-[260px] w-[260px] text-[#F68A0A] opacity-[0.16]" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="34" fill="currentColor" />
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i * Math.PI) / 6;
              return (
                <line key={i} x1={Math.round(100 + Math.cos(a) * 50)} y1={Math.round(100 + Math.sin(a) * 50)} x2={Math.round(100 + Math.cos(a) * 82)} y2={Math.round(100 + Math.sin(a) * 82)} stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
              );
            })}
          </svg>
          <p className="m-0 flex items-center gap-2 text-[13px] font-bold text-[#FFE866]">
            <PortalIcon name="spark" size={16} />
            Next best step
          </p>
          {loading ? (
            <Skeleton className="h-24 bg-white/10" />
          ) : (
            <>
              <h2 id="next-step" className="m-0 max-w-[560px] font-source-sans text-[25px] font-extrabold leading-[1.2] sm:text-[28px]">
                {step.title}
              </h2>
              <ul className="m-0 flex max-w-[560px] flex-col gap-2 pl-5 text-[14.5px] leading-[1.5] text-[#D6E1F0]">
                {step.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <div className="mt-1 flex flex-wrap gap-2.5">
                <ButtonLink href={step.primary.href} icon="arrow">
                  {step.primary.label}
                </ButtonLink>
                {step.secondary ? (
                  <ButtonLink href={step.secondary.href} variant="ghost-dark">
                    {step.secondary.label}
                  </ButtonLink>
                ) : null}
              </div>
            </>
          )}
        </section>

        <Panel
          title={design ? `Selected: ${design.title}` : "Your system"}
          meta={design ? (options?.locked ? "Approved" : "You can still change it") : undefined}
        >
          {optionsLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[74px]" />
              ))}
            </div>
          ) : design ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Solar" value={design.kw > 0 ? `${design.kw.toFixed(1)} kW` : EMPTY_VALUE} hint={design.panelCount > 0 ? `${design.panelCount} panels` : "Panel count at quote"} />
                <Stat
                  label="Battery"
                  value={design.batteryKwh && design.batteryKwh > 0 ? `${design.batteryKwh} kWh` : "None yet"}
                  hint={design.batteryModel ?? (design.batteryKwh ? "Model at quote" : "Can be added later")}
                />
                <Stat label="Est. savings" value={design.estimatedSavings > 0 ? `${formatOptionPrice(design.estimatedSavings)}/yr` : EMPTY_VALUE} hint="first year" tone="good" />
                <Stat label="Your price" value={price > 0 ? formatOptionPrice(price) : EMPTY_VALUE} hint={design.priceAfterStc ? "after STCs, incl. GST" : "incl. GST"} />
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-[14px] font-semibold">
                <a href="/customers/design" className="text-[#1D4ED8] hover:underline">
                  See the full design
                </a>
                <button type="button" onClick={() => askEasylinkAi(`Explain my ${design.title} system: why this size, and what affects my savings?`)} className="flex items-center gap-1.5 text-[#1D4ED8] hover:underline">
                  <PortalIcon name="spark" size={15} />
                  Ask AI to explain it
                </button>
              </div>
            </>
          ) : (
            <EmptyNote icon="design" title="No system chosen yet">
              Pick one of your designs below, or start a new one. Your savings and price show here once you do.
            </EmptyNote>
          )}
        </Panel>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-[1fr_1.35fr_1fr]">
        <Panel title="My installer">
          <EmptyNote icon="shield" title="Matched by EasyLink">
            Your accredited local installer appears here once your job is booked. EasyLink checks their licence and insurance.
          </EmptyNote>
          <ButtonLink href="/customers/messages" variant="quiet" icon="messages">
            Message EasyLink
          </ButtonLink>
        </Panel>

        <Panel title={<span className="flex items-center gap-2"><PortalIcon name="spark" size={17} className="text-[#F68A0A]" />EasyLink AI noticed</span>}>
          {optionsLoading ? (
            <Skeleton className="h-28" />
          ) : insights.length ? (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {insights.map((it) => (
                <li key={it.text} className="flex gap-3 text-[14px] leading-[1.5] text-[#334155]">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[#FFF4D6] text-[#B45309]">
                    <PortalIcon name={it.icon} size={15} />
                  </span>
                  {it.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-[14px] leading-[1.5] text-[#475569]">Once you choose a system, EasyLink AI points out what matters about it here.</p>
          )}
        </Panel>

        <Panel title="Shortcuts">
          <div className="flex flex-col gap-2">
            {[
              { href: "/designs", label: "Design another system", icon: "design" as const },
              { href: "/customers/project", label: "Track my project", icon: "project" as const },
              { href: "/customers/payments", label: "Payments and receipts", icon: "payments" as const },
              { href: "/customers/products", label: "Add a battery or EV charger", icon: "battery" as const },
            ].map((l) => (
              <a key={l.href} href={l.href} className="flex min-h-[46px] items-center gap-3 rounded-[12px] bg-[#F4F6FA] px-3.5 text-[14px] font-semibold text-[#0F172A] no-underline hover:bg-[#EAEFF5]">
                <PortalIcon name={l.icon} size={18} className="text-[#5B6B80]" />
                <span className="flex-1">{l.label}</span>
                <PortalIcon name="arrow" size={16} className="text-[#94A3B8]" />
              </a>
            ))}
          </div>
        </Panel>
      </div>

      <DesignChoices options={options} loading={optionsLoading} savingKey={savingKey} onChoose={(k) => void choose(k)} />
    </CustomerPortalShell>
  );
}
