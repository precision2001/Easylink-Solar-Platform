"use client";

import { useState } from "react";
import Link from "next/link";
import { CustomerTopNav } from "@/components/customer/portal/CustomerTopNav";

/**
 * Matches the Easylink Designer "Maintenance plan" mock
 * (CustMaintenance.dc.html) — the annual maintenance contract as a three-step
 * wizard: Details, Services, Signatures.
 *
 * Nothing behind this is built. There is no maintenance-contract model, no
 * contract number, no signature store and no drone-inspection report; the
 * only maintenance thing this app really has is a quote *request* that becomes
 * a sales lead, which still lives at /customers/solar-maintenance/request and
 * is linked from the header here.
 *
 * So the whole page is the mock's sample data, and the two actions that would
 * commit the customer to something are deliberately inert:
 *
 * - "Sign and send" does not send. Typing a name into a signature box and
 *   having the page say it was sent to the installer would be asserting a
 *   contract exists when none was recorded anywhere.
 * - "Save draft" saves nothing, for the same reason.
 *
 * Stepping between the three panes, ticking services and the running count are
 * real local state, because that is what the mock is demonstrating — but the
 * footer says plainly that nothing is stored.
 */

const SUN = "#F68A0A";
const SUN_INK = "#3B1D00";
const NAVY = "#0B1A2E";
const INK = "#0F172A";
const MUTED = "#5B6B80";
const SLATE = "#475569";
const BORDER = "#E3E8EF";
const BORDER_2 = "#CBD5E1";
const RULE = "#EEF2F6";
const SOFT = "#F8FAFC";
const WHITE = "#FFFFFF";
const GREEN = "#166534";
const GREEN_SOFT = "#DCFCE7";
const CREAM = "#FFF7E6";

type Field = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  /** Read-only fields come from the project, so they are not editable here. */
  readOnly: boolean;
};

const FIELDS: Field[] = [
  {
    id: "provider",
    label: "Service provider",
    value: "Solarman (your installer)",
    placeholder: "",
    readOnly: true,
  },
  {
    id: "contract",
    label: "Contract number",
    value: "AMC-2026-0142",
    placeholder: "",
    readOnly: true,
  },
  {
    id: "starts",
    label: "Starts",
    value: "On switch-on day",
    placeholder: "",
    readOnly: true,
  },
  {
    id: "client",
    label: "Client name",
    value: "Daniel Moretti",
    placeholder: "",
    readOnly: false,
  },
  {
    id: "location",
    label: "Installation location",
    value: "[Street], Yagoona NSW 2198",
    placeholder: "",
    readOnly: true,
  },
  {
    id: "company",
    label: "Company name (if a business)",
    value: "",
    placeholder: "Optional",
    readOnly: false,
  },
  {
    id: "abn",
    label: "ABN / ACN (if a business)",
    value: "",
    placeholder: "XX XXX XXX XXX",
    readOnly: false,
  },
  {
    id: "contact",
    label: "Best contact for visits",
    value: "[phone]",
    placeholder: "",
    readOnly: false,
  },
];

const EQUIPMENT: { type: string; model: string; size: string; qty: string }[] = [
  {
    type: "Panels",
    model: "AXITEC AC-440TGB/108BBA",
    size: "14.52 kW",
    qty: "33",
  },
  { type: "Inverter", model: "FOXESS 1K5-1P-HI-9.9", size: "9.9 kW", qty: "1" },
  {
    type: "Battery",
    model: "FOX ESS 1K5-BAT-4660-L7",
    size: "32.61 kWh",
    qty: "1",
  },
  {
    type: "Accessories",
    model: "myenergi zappi v2, Reclaim Gen3",
    size: "7 kW · 270 L",
    qty: "2",
  },
];

const SERVICES: { title: string; detail: string; price: string }[] = [
  {
    title: "Annual safety inspection and report",
    detail: "Solarman · isolators, cabling, roof fixings, switchboard",
    price: "Included",
  },
  {
    title: "Panel cleaning by drone",
    detail: "EasyLink drone team · up to 40 panels, before and after photos",
    price: "Included",
  },
  {
    title: "Battery health check and firmware updates",
    detail: "Solarman · capacity test and app check",
    price: "Included",
  },
  {
    title: "Inverter monitoring alerts",
    detail: "We watch your system and call if output drops",
    price: "+$[X]",
  },
  {
    title: "Priority call-out within 48 hours",
    detail: "For faults between visits",
    price: "+$[X]",
  },
];

/** The mock starts with the three included services ticked. */
const INITIAL_ON = [true, true, true, false, false];

const STEPS = ["Details", "Services", "Signatures"];

export function CustomerMaintenancePlan() {
  const [step, setStep] = useState(1);
  const [on, setOn] = useState<boolean[]>(INITIAL_ON);
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);

  const chosen = on.filter(Boolean).length;

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6FA]" style={{ color: INK }}>
      <CustomerTopNav active="maintenance" />

      <main className="mx-auto flex w-full max-w-[980px] flex-col gap-[18px] px-6 pt-6 pb-14">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grow">
            <h1 className="m-0 font-source-sans text-[28px] font-bold">
              Solar &amp; battery maintenance plan
            </h1>
            <p className="mt-1 mb-0 text-[13px]" style={{ color: MUTED }}>
              Annual maintenance contract · details come from your project, so
              there&rsquo;s little to type
            </p>
          </div>
          <span
            title="This contract wizard is a design preview — no maintenance contract is stored by this app yet"
            className="cursor-help rounded-full px-2.5 py-0.75 text-[12px] font-bold"
            style={{ background: "#DBEAFE", color: "#1E40AF" }}
          >
            Sample data
          </span>
        </div>

        {/* The real, working thing: a maintenance quote request that becomes a
            lead. Linked here so it isn't lost behind the preview. */}
        <p className="m-0 text-[13px]" style={{ color: SLATE }}>
          Want a service booked now?{" "}
          <Link
            href="/customers/solar-maintenance/request"
            prefetch={false}
            className="font-semibold text-[#1565C0]"
          >
            Ask for a maintenance quote
          </Link>{" "}
          — that form reaches the EasyLink team.
        </p>

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
            Latest drone inspection: 7 dusty panels, 1 hot spot under warranty
          </strong>
          <span className="text-[13px]">
            We spotted lower output in your live data and a licensed pilot flew
            the check on 20 Oct.{" "}
            {/* No drone report or energy page exists yet. */}
            <span title="Not built yet" className="cursor-help underline">
              Open the report
            </span>{" "}
            ·{" "}
            <span title="Not built yet" className="cursor-help underline">
              My energy
            </span>
          </span>
        </div>

        <ol
          aria-label="Steps"
          className="m-0 flex list-none flex-wrap gap-2 p-0"
        >
          {STEPS.map((label, i) => {
            const n = i + 1;
            const current = n === step;
            const done = n < step;
            return (
              <li key={label}>
                <button
                  type="button"
                  aria-current={current ? "step" : undefined}
                  onClick={() => setStep(n)}
                  className="h-10 rounded-full px-3.5 text-[13px] font-semibold"
                  style={{
                    border: `1px solid ${current ? NAVY : BORDER_2}`,
                    background: current ? NAVY : done ? GREEN_SOFT : WHITE,
                    color: current ? WHITE : done ? GREEN : SLATE,
                  }}
                >
                  {n} · {label}
                </button>
              </li>
            );
          })}
        </ol>

        <section
          className="flex flex-col gap-[18px] rounded-[14px] bg-white p-[22px]"
          style={{ border: `1px solid ${BORDER}` }}
        >
          {step === 1 ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {FIELDS.map((f) => (
                  <div key={f.id} className="flex flex-col gap-1">
                    <label
                      htmlFor={f.id}
                      className="text-[12px] font-semibold"
                      style={{ color: SLATE }}
                    >
                      {f.label}
                    </label>
                    <input
                      id={f.id}
                      defaultValue={f.value}
                      placeholder={f.placeholder}
                      readOnly={f.readOnly}
                      className="h-11 rounded-[10px] px-3 text-[14px]"
                      style={{
                        border: `1px solid ${BORDER_2}`,
                        background: f.readOnly ? SOFT : WHITE,
                      }}
                    />
                  </div>
                ))}
              </div>

              <h2 className="m-0 text-[15px] font-bold">
                Equipment covered{" "}
                <span className="font-medium" style={{ color: MUTED }}>
                  · from your design
                </span>
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-140 border-collapse text-[13px]">
                  <thead>
                    <tr className="text-left" style={{ color: SLATE }}>
                      {["Type", "Model", "Size", "Qty", "Installed"].map((h) => (
                        <th
                          key={h}
                          className="p-2 font-semibold"
                          style={{ borderBottom: `1px solid ${BORDER}` }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {EQUIPMENT.map((e) => (
                      <tr key={e.type}>
                        <td
                          className="px-2 py-2.5 font-semibold"
                          style={{ borderBottom: `1px solid ${RULE}` }}
                        >
                          {e.type}
                        </td>
                        <td
                          className="px-2 py-2.5"
                          style={{ borderBottom: `1px solid ${RULE}` }}
                        >
                          {e.model}
                        </td>
                        <td
                          className="px-2 py-2.5"
                          style={{ borderBottom: `1px solid ${RULE}` }}
                        >
                          {e.size}
                        </td>
                        <td
                          className="px-2 py-2.5"
                          style={{ borderBottom: `1px solid ${RULE}` }}
                        >
                          {e.qty}
                        </td>
                        <td
                          className="px-2 py-2.5"
                          style={{
                            borderBottom: `1px solid ${RULE}`,
                            color: MUTED,
                          }}
                        >
                          After install
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="flex flex-col gap-2">
              <h2 className="m-0 mb-1 text-[15px] font-bold">
                Choose your services
              </h2>
              {SERVICES.map((s, i) => {
                const ticked = on[i]!;
                return (
                  <label
                    key={s.title}
                    className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl px-3"
                    style={{
                      border: `1px solid ${ticked ? SUN : BORDER}`,
                      background: ticked ? CREAM : WHITE,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={ticked}
                      onChange={() =>
                        setOn((prev) =>
                          prev.map((v, j) => (j === i ? !v : v)),
                        )
                      }
                      className="size-5 accent-[#F68A0A]"
                    />
                    <span className="flex grow flex-col">
                      <span className="text-[14px] font-semibold">
                        {s.title}
                      </span>
                      <span className="text-[12px]" style={{ color: MUTED }}>
                        {s.detail}
                      </span>
                    </span>
                    <span
                      className="text-[13px] font-semibold"
                      style={{ color: SLATE }}
                    >
                      {s.price}
                    </span>
                  </label>
                );
              })}
              <div className="flex flex-wrap items-center gap-2.5 pt-2 text-[14px]">
                <span className="grow">
                  {chosen} services · paid yearly, cancel any time before
                  renewal
                </span>
                <strong>$[X] / year</strong>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="flex flex-col gap-3">
              <h2 className="m-0 text-[15px] font-bold">Signatures</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div
                  className="flex flex-col gap-1.5 rounded-xl p-3.5"
                  style={{ border: `1px solid ${BORDER}` }}
                >
                  <label
                    htmlFor="signature"
                    className="text-[12px] font-semibold"
                    style={{ color: SLATE }}
                  >
                    Customer · type your full name to sign
                  </label>
                  <input
                    id="signature"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="Daniel Moretti"
                    className="h-12 rounded-[10px] px-3 font-source-sans text-[20px] italic"
                    style={{ border: `1px solid ${BORDER_2}` }}
                  />
                  <span className="text-[12px]" style={{ color: MUTED }}>
                    Dated today when you sign
                  </span>
                </div>
                <div
                  className="flex flex-col gap-1.5 rounded-xl p-3.5"
                  style={{
                    border: `1px dashed ${BORDER_2}`,
                    background: SOFT,
                  }}
                >
                  <span
                    className="text-[12px] font-semibold"
                    style={{ color: SLATE }}
                  >
                    Service provider
                  </span>
                  <strong className="text-[15px]">Solarman · Emmanuel</strong>
                  <span className="text-[12px]" style={{ color: MUTED }}>
                    Signs in their portal after you do · you get the
                    countersigned PDF
                  </span>
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-[13px]">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="size-5 accent-[#F68A0A]"
                />
                <span>
                  I&rsquo;ve read the contract terms, including what&rsquo;s
                  excluded (storm damage, roof repairs) and the cooling-off
                  period.
                </span>
              </label>
            </div>
          ) : null}

          <div
            className="flex flex-wrap gap-2.5 pt-4"
            style={{ borderTop: `1px solid ${RULE}` }}
          >
            <span
              title="Saving isn't built yet — no maintenance contract is stored by this app"
              className="flex h-11 cursor-help items-center rounded-[10px] bg-white px-4 text-[14px] font-semibold"
              style={{ border: `1px solid ${BORDER_2}`, color: SLATE }}
            >
              Save draft
            </span>
            <span className="grow" />
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="h-11 rounded-[10px] bg-white px-4 text-[14px] font-semibold"
                style={{ border: `1px solid ${BORDER_2}` }}
              >
                Back
              </button>
            ) : null}
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="h-11 rounded-[10px] px-5.5 text-[14px] font-bold"
                style={{ background: SUN, color: SUN_INK }}
              >
                Continue
              </button>
            ) : (
              /* Inert on purpose: a contract that says it was sent, with
                 nothing recording it, is worse than one that admits it. */
              <span
                title="Signing isn't built yet — there is no contract or signature store behind this page"
                className="flex h-11 cursor-help items-center rounded-[10px] px-5.5 text-[14px] font-bold"
                style={{ background: SUN, color: SUN_INK, opacity: 0.6 }}
              >
                Sign and send
              </span>
            )}
          </div>

          <p className="m-0 text-[12px]" style={{ color: SLATE }}>
            This wizard is a preview — stepping through it and ticking services
            changes nothing on your account, and no contract is created.
          </p>
        </section>
      </main>
    </div>
  );
}
