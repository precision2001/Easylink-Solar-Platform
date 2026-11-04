"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { askEasylinkAi } from "@/components/ai-chat/EasylinkAiChatbot";
import { CustomerPortalShell, PortalPageHeader } from "@/components/customer/portal/CustomerPortalShell";
import { PortalIcon, type PortalIconName } from "@/components/customer/portal/PortalIcon";
import { Panel } from "@/components/customer/portal/PortalParts";
import {
  MAINTENANCE_PLANS,
  MAINTENANCE_TIMING_OPTIONS,
  submitMaintenanceRequest,
  validateMaintenanceRequest,
  type MaintenancePlanKey,
  type MaintenanceRequestErrors,
  type MaintenanceRequestForm,
} from "@/lib/customers/maintenance-request";
import { useAppSelector } from "@/lib/store/hooks";

/**
 * "Keep your system at its best": what a service covers, plan options without
 * prices, and a real quote request that becomes a sales lead. There is no
 * maintenance-contract backend, so nothing here pretends to sign one.
 */

const CLEAN_QUESTION = "How often should my panels be cleaned in my area?";

const COVERS: { icon: PortalIconName; title: string; text: string }[] = [
  {
    icon: "sun",
    title: "Panel clean",
    text: "Dust, pollen, salt and bird droppings washed off with soft brushes and pure water. Where your roof suits it, EasyLink's drone clean does it without anyone walking on your tiles.",
  },
  {
    icon: "battery",
    title: "Inverter and battery health check",
    text: "We read the error logs, check firmware and ventilation, and confirm your battery charges and discharges the way it should.",
  },
  {
    icon: "shield",
    title: "Electrical safety inspection",
    text: "A licensed electrician checks isolators, cabling, connectors and mounting for wear, water and heat damage.",
  },
  {
    icon: "project",
    title: "Written report",
    text: "Photos, test results and anything to watch, so you have a record for warranty claims and know your system is healthy.",
  },
];

const inputClass =
  "w-full rounded-[12px] border bg-white px-3.5 text-[15px] text-[#0F172A] placeholder:text-[#7A8AA0] focus-visible:border-[#0B1A2E] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0B1A2E]/10";

function Field({ id, label, error, children, optional }: { id: string; label: string; error?: string; children: ReactNode; optional?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-[13.5px] font-semibold text-[#334155]">
        {label}
        {optional ? <span className="font-normal text-[#5B6B80]"> (optional)</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-err`} className="m-0 text-[13px] font-semibold text-[#991B1B]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const EMPTY: MaintenanceRequestForm = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  address: "",
  plan: "annual",
  timing: "flexible",
  notes: "",
  consent: false,
};

export function SolarMaintenancePageView() {
  const user = useAppSelector((s) => s.customerAuth.user);
  const ids = useId();
  const [form, setForm] = useState<MaintenanceRequestForm>(EMPTY);
  const [errors, setErrors] = useState<MaintenanceRequestErrors>({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ phone: string } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Prefill from the profile without overwriting anything already typed.
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      firstName: f.firstName || user.firstName || "",
      lastName: f.lastName || user.lastName || "",
      phone: f.phone || user.phone || "",
      email: f.email || user.email || "",
      address: f.address || user.address || "",
    }));
  }, [user]);

  function set<K extends keyof MaintenanceRequestForm>(key: K, value: MaintenanceRequestForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function choosePlan(key: MaintenancePlanKey) {
    set("plan", key);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (sending) return;
    const found = validateMaintenanceRequest(form);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`${ids}-${first}`)?.focus();
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      await submitMaintenanceRequest(form);
      setSent({ phone: form.phone.trim() });
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "We couldn't send your request. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const fieldProps = (key: keyof MaintenanceRequestForm) => ({
    id: `${ids}-${key}`,
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `${ids}-${key}-err` : undefined,
  });
  const border = (key: keyof MaintenanceRequestForm) => (errors[key] ? "border-[#DC2626]" : "border-[#CBD5E1]");
  const plan = MAINTENANCE_PLANS.find((p) => p.key === form.plan);

  return (
    <CustomerPortalShell active="maintenance">
      <PortalPageHeader
        eyebrow="Maintenance plan"
        title="Keep your system at its best"
        intro="Panels get dirty and parts wear. A regular service keeps your system producing, catches problems early and gives you a record for warranty claims."
        actions={
          <button
            type="button"
            onClick={() => askEasylinkAi(CLEAN_QUESTION)}
            className="inline-flex min-h-[46px] items-center gap-2 rounded-[13px] border border-[#CBD5E1] bg-white px-[18px] text-[14.5px] font-bold text-[#0F172A] hover:border-[#64748B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
          >
            <PortalIcon name="spark" size={18} className="text-[#F68A0A]" />
            {CLEAN_QUESTION}
          </button>
        }
      />

      <section aria-labelledby="covers-title" className="flex flex-col gap-4">
        <h2 id="covers-title" className="m-0 font-source-sans text-[24px] font-extrabold text-[#0F172A]">
          What a service covers
        </h2>
        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-4">
          {COVERS.map((c) => (
            <li key={c.title} className="flex flex-col gap-3 rounded-[20px] border border-[#E2E8F0] bg-white p-5">
              <span className="flex size-11 items-center justify-center rounded-full bg-[#FFF4D6] text-[#B45309]">
                <PortalIcon name={c.icon} size={22} />
              </span>
              <h3 className="m-0 text-[16px] font-bold text-[#0F172A]">{c.title}</h3>
              <p className="m-0 text-[14px] leading-[1.55] text-[#475569]">{c.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="plans-title" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="plans-title" className="m-0 font-source-sans text-[24px] font-extrabold text-[#0F172A]">
            Choose how often
          </h2>
          <p className="m-0 max-w-[680px] text-[14.5px] leading-[1.5] text-[#475569]">
            Pick what suits your home. Your price depends on your roof, system size and location, so it&apos;s confirmed in your quote. Nothing is booked
            or charged until you accept it.
          </p>
        </div>
        <div role="radiogroup" aria-labelledby="plans-title" className="grid gap-4 md:grid-cols-3">
          {MAINTENANCE_PLANS.map((p) => {
            const on = p.key === form.plan;
            return (
              <button
                key={p.key}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => choosePlan(p.key)}
                className={`flex flex-col overflow-hidden rounded-[22px] bg-white text-left transition-shadow focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2563EB] ${
                  on ? "shadow-[0_0_0_3px_#F68A0A,0_14px_30px_rgba(246,138,10,0.16)]" : "border border-[#E2E8F0] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
                }`}
              >
                <div className={`flex flex-col gap-1 px-5 py-4 ${on ? "bg-gradient-to-r from-[#FFE866] to-[#F68A0A]" : "bg-[#F1F5F9]"}`}>
                  <span className="flex items-center justify-between gap-2">
                    <span className={`font-source-sans text-[21px] font-extrabold ${on ? "text-[#3B1D00]" : "text-[#0F172A]"}`}>{p.title}</span>
                    <span
                      aria-hidden="true"
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-[#3B1D00] bg-[#3B1D00] text-[#FFE866]" : "border-[#94A3B8] bg-white"}`}
                    >
                      {on ? <PortalIcon name="check" size={14} /> : null}
                    </span>
                  </span>
                  <span className={`text-[13.5px] font-semibold leading-[1.45] ${on ? "text-[#4A2600]" : "text-[#475569]"}`}>{p.summary}</span>
                </div>
                <ul className="m-0 flex list-none flex-col gap-2 px-5 py-4 text-[14px] text-[#334155]">
                  {p.includes.map((i) => (
                    <li key={i} className="flex items-start gap-2">
                      <PortalIcon name="check" size={16} className="mt-0.5 shrink-0 text-[#15803D]" />
                      {i}
                    </li>
                  ))}
                </ul>
                <span className="mt-auto border-t border-[#EEF2F6] px-5 py-3 text-[13px] font-semibold text-[#5B6B80]">Price confirmed in your quote</span>
              </button>
            );
          })}
        </div>
      </section>

      <div ref={formRef} id="request" className="grid scroll-mt-24 items-start gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        {/* The one bold card: what happens when you ask. */}
        <section aria-labelledby="next-title" className="relative flex flex-col gap-4 overflow-hidden rounded-[22px] bg-[#0B1A2E] p-6 text-white sm:p-7">
          <svg aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-[240px] w-[240px] text-[#F68A0A] opacity-[0.16]" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="34" fill="currentColor" />
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i * Math.PI) / 6;
              // Rounded so server and client render identical attribute strings.
              const at = (r: number, f: (x: number) => number) => Math.round((100 + f(a) * r) * 100) / 100;
              return <line key={i} x1={at(50, Math.cos)} y1={at(50, Math.sin)} x2={at(82, Math.cos)} y2={at(82, Math.sin)} stroke="currentColor" strokeWidth="8" strokeLinecap="round" />;
            })}
          </svg>
          <p className="m-0 flex items-center gap-2 text-[13px] font-bold text-[#FFE866]">
            <PortalIcon name="maintenance" size={16} />
            Request a maintenance quote
          </p>
          <h2 id="next-title" className="m-0 max-w-[460px] font-source-sans text-[25px] font-extrabold leading-[1.2] sm:text-[28px]">
            Tell us when suits you. We&apos;ll do the rest.
          </h2>
          <ol className="m-0 flex flex-col gap-3 p-0 text-[14.5px] leading-[1.5] text-[#D6E1F0]">
            {[
              "EasyLink calls you to confirm your system and any access details.",
              "You get a quote with the price for the plan you chose.",
              "Accept it and we book your first visit at a time that suits you.",
            ].map((s, i) => (
              <li key={s} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[13px] font-bold text-[#FFE866]">{i + 1}</span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => askEasylinkAi(CLEAN_QUESTION)}
            className="mt-1 inline-flex min-h-[46px] w-fit items-center gap-2 rounded-[13px] border border-[#3E5A80] px-[18px] text-[14.5px] font-bold text-white hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFE866]"
          >
            <PortalIcon name="spark" size={18} className="text-[#FFE866]" />
            Ask AI how often to clean
          </button>
        </section>

        {sent ? (
          <Panel>
            <div role="status" className="flex flex-col items-start gap-3">
              <span className="flex size-12 items-center justify-center rounded-full bg-[#ECFDF3] text-[#15803D]">
                <PortalIcon name="check" size={26} />
              </span>
              <h2 className="m-0 font-source-sans text-[24px] font-extrabold text-[#0F172A]">Request sent</h2>
              <p className="m-0 max-w-[520px] text-[15px] leading-[1.55] text-[#475569]">
                Thanks{form.firstName ? `, ${form.firstName.trim()}` : ""}. EasyLink has your request for <strong className="text-[#0F172A]">{plan?.title}</strong>.
                We&apos;ll contact you on {sent.phone} to confirm the details and send your quote.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSent(null);
                  setForm((f) => ({ ...f, notes: "", consent: false }));
                }}
                className="inline-flex min-h-[44px] items-center text-[14px] font-semibold text-[#1D4ED8] hover:underline"
              >
                Send another request
              </button>
            </div>
          </Panel>
        ) : (
          <Panel title="Your request" meta={plan ? `Plan: ${plan.title}` : undefined}>
            <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id={`${ids}-firstName`} label="First name" error={errors.firstName}>
                  <input {...fieldProps("firstName")} autoComplete="given-name" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className={`${inputClass} h-12 ${border("firstName")}`} />
                </Field>
                <Field id={`${ids}-lastName`} label="Last name" error={errors.lastName}>
                  <input {...fieldProps("lastName")} autoComplete="family-name" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className={`${inputClass} h-12 ${border("lastName")}`} />
                </Field>
                <Field id={`${ids}-phone`} label="Phone" error={errors.phone}>
                  <input {...fieldProps("phone")} type="tel" inputMode="tel" autoComplete="tel" placeholder="04xx xxx xxx" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={`${inputClass} h-12 ${border("phone")}`} />
                </Field>
                <Field id={`${ids}-email`} label="Email" error={errors.email}>
                  <input {...fieldProps("email")} type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={`${inputClass} h-12 ${border("email")}`} />
                </Field>
                <div className="sm:col-span-2">
                  <Field id={`${ids}-address`} label="Property address" optional>
                    <input {...fieldProps("address")} autoComplete="street-address" value={form.address} onChange={(e) => set("address", e.target.value)} className={`${inputClass} h-12 ${border("address")}`} />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field id={`${ids}-timing`} label="When would you like the first visit?">
                    <select
                      {...fieldProps("timing")}
                      value={form.timing}
                      onChange={(e) => set("timing", e.target.value as MaintenanceRequestForm["timing"])}
                      className={`${inputClass} h-12 ${border("timing")}`}
                    >
                      {MAINTENANCE_TIMING_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field id={`${ids}-notes`} label="Anything we should know?" optional error={errors.notes}>
                    <textarea
                      {...fieldProps("notes")}
                      rows={4}
                      placeholder="For example: two-storey roof, trees nearby, inverter showing an error, dogs in the yard."
                      value={form.notes}
                      onChange={(e) => set("notes", e.target.value)}
                      className={`${inputClass} resize-y py-3 ${border("notes")}`}
                    />
                  </Field>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="flex cursor-pointer items-start gap-3 rounded-[14px] bg-[#F4F6FA] p-3.5 text-[14px] leading-[1.5] text-[#334155]">
                  <input
                    {...fieldProps("consent")}
                    type="checkbox"
                    checked={form.consent}
                    onChange={(e) => set("consent", e.target.checked)}
                    className="mt-0.5 size-5 shrink-0 accent-[#0B1A2E]"
                  />
                  <span>EasyLink Solar can contact me by phone and email about this maintenance request.</span>
                </label>
                {errors.consent ? (
                  <p id={`${ids}-consent-err`} className="m-0 text-[13px] font-semibold text-[#991B1B]">
                    {errors.consent}
                  </p>
                ) : null}
              </div>

              {sendError ? (
                <p role="alert" className="m-0 rounded-[12px] bg-[#FEE2E2] px-3.5 py-2.5 text-[14px] text-[#991B1B]">
                  {sendError}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-[13px] bg-[#F68A0A] px-5 text-[15px] font-bold text-[#3B1D00] hover:bg-[#FF9A1F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] disabled:cursor-wait disabled:opacity-60"
                >
                  {sending ? "Sending…" : "Request a maintenance quote"}
                  {!sending ? <PortalIcon name="arrow" size={18} /> : null}
                </button>
                <span className="text-[13px] text-[#5B6B80]">No payment needed. Price confirmed in your quote.</span>
              </div>
            </form>
          </Panel>
        )}
      </div>
    </CustomerPortalShell>
  );
}
