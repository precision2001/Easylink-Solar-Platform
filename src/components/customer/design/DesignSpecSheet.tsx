"use client";

import type { ReactNode } from "react";
import { askEasylinkAi } from "@/components/ai-chat/EasylinkAiChatbot";
import { PortalIcon, type PortalIconName } from "@/components/customer/portal/PortalIcon";
import {
  aud,
  designAiQuestions,
  kwhLabel,
  kwLabel,
  priceBasisLabel,
  type DesignSpecSheet as Sheet,
} from "@/lib/customers/design-spec-sheet";

function Row({ icon, label, value, detail }: { icon: PortalIconName; label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-b border-white/10 py-3 last:border-b-0">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-white/[0.07] text-[#FFE866]">
        <PortalIcon name={icon} size={17} />
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <dt className="text-[13.5px] text-[#A9BBD3]">{label}</dt>
        <dd className="m-0 min-w-0 text-right text-[15px] font-bold text-white">
          {value}
          {detail ? <span className="block text-[12.5px] font-medium text-[#A9BBD3]">{detail}</span> : null}
        </dd>
      </div>
    </div>
  );
}

/**
 * The one bold card on My design: the selected system as a spec sheet, with
 * savings and price, and questions for EasyLink AI built from these figures.
 */
export function DesignSpecSheet({ sheet, locked }: { sheet: Sheet; locked: boolean }) {
  const questions = designAiQuestions(sheet);
  const atQuote = <span className="font-medium text-[#A9BBD3]">Confirmed at quote</span>;

  return (
    <section
      aria-labelledby="spec-sheet-title"
      className="relative flex flex-col gap-5 overflow-hidden rounded-[22px] bg-[#0B1A2E] p-6 text-white sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="m-0 flex items-center gap-2 text-[13px] font-bold text-[#FFE866]">
            <PortalIcon name="sun" size={16} />
            Spec sheet
          </p>
          <h2 id="spec-sheet-title" className="m-0 font-source-sans text-[44px] font-extrabold leading-none tracking-[-0.02em] tabular-nums">
            {sheet.kw ? kwLabel(sheet.kw) : "Size at quote"}
          </h2>
          <p className="m-0 text-[14px] text-[#C9D6EA]">
            {sheet.kw ? "Solar system" : "Your installer confirms the size at quote"}
            {sheet.hasBattery ? (sheet.batteryKwh ? ` + ${kwhLabel(sheet.batteryKwh)} battery` : " + battery") : ""}
          </p>
        </div>
        {locked ? (
          <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[13px] font-bold text-[#0B1A2E]">
            <PortalIcon name="lock" size={14} />
            Approved
          </span>
        ) : (
          <span className="rounded-full border border-[#3E5A80] px-3 py-1.5 text-[13px] font-semibold text-[#C9D6EA]">Not yet approved</span>
        )}
      </div>

      <dl className="m-0 flex flex-col">
        <Row
          icon="sun"
          label="Panels"
          value={sheet.panelCount ? `${sheet.panelCount}${sheet.panelWatts ? ` × ${sheet.panelWatts} W` : " panels"}` : atQuote}
          detail={sheet.panelModel}
        />
        <Row
          icon="bolt"
          label="Inverter"
          value={sheet.inverterModel ?? atQuote}
          detail={sheet.inverterKw ? `${sheet.inverterKw} kW rated` : undefined}
        />
        <Row
          icon="battery"
          label="Battery"
          value={sheet.batteryKwh ? kwhLabel(sheet.batteryKwh) : sheet.hasBattery ? atQuote : "None — can add later"}
          detail={sheet.batteryModel}
        />
        <Row
          icon="leaf"
          label="Yearly output"
          value={sheet.annualKwh ? `${new Intl.NumberFormat("en-AU").format(Math.round(sheet.annualKwh))} kWh` : atQuote}
          detail={sheet.annualKwh ? `about ${new Intl.NumberFormat("en-AU", { maximumFractionDigits: 1 }).format(sheet.annualKwh / 365)} kWh a day` : undefined}
        />
      </dl>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col gap-0.5 rounded-[16px] bg-[#FFE866] px-4 py-3.5 text-[#3B1D00]">
          <span className="text-[12.5px] font-semibold">Est. savings</span>
          <span className="font-source-sans text-[26px] font-extrabold leading-tight tabular-nums">
            {sheet.savingsPerYear ? aud(sheet.savingsPerYear) : "—"}
          </span>
          <span className="text-[12px] font-semibold">{sheet.savingsPerYear ? "a year" : "Worked out at quote"}</span>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5 rounded-[16px] bg-white/[0.08] px-4 py-3.5">
          <span className="text-[12.5px] font-semibold text-[#C9D6EA]">Your price</span>
          <span className="font-source-sans text-[26px] font-extrabold leading-tight tabular-nums">{sheet.price ? aud(sheet.price) : "—"}</span>
          <span className="text-[12px] text-[#C9D6EA]">{sheet.price ? priceBasisLabel(sheet.priceBasis) : "Confirmed at quote"}</span>
        </div>
      </div>

      {sheet.stcDiscount || sheet.paybackYears ? (
        <p className="m-0 flex flex-wrap gap-x-5 gap-y-1 text-[13.5px] text-[#C9D6EA]">
          {sheet.stcDiscount ? (
            <span>
              STCs take <strong className="text-white">{aud(sheet.stcDiscount)}</strong> off
              {sheet.priceBeforeStc ? ` ${aud(sheet.priceBeforeStc)}` : ""}
            </span>
          ) : null}
          {sheet.paybackYears ? (
            <span>
              Pays for itself in about <strong className="text-white">{sheet.paybackYears} years</strong>
            </span>
          ) : null}
        </p>
      ) : null}

      {questions.length ? (
        <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
          <p className="m-0 flex items-center gap-2 text-[13px] font-semibold text-[#C9D6EA]">
            <PortalIcon name="spark" size={15} className="text-[#FFE866]" />
            Ask EasyLink AI about this system
          </p>
          <div className="flex flex-wrap gap-2">
            {questions.map((q) => (
              <button
                key={q.key}
                type="button"
                onClick={() => askEasylinkAi(q.question)}
                className="min-h-[44px] rounded-full border border-[#3E5A80] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFE866]"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
