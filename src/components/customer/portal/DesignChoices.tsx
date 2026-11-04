"use client";

import Image from "next/image";
import Link from "next/link";
import { askEasylinkAi } from "@/components/ai-chat/EasylinkAiChatbot";
import { PortalIcon } from "@/components/customer/portal/PortalIcon";
import { ButtonLink, EmptyNote, Skeleton } from "@/components/customer/portal/PortalParts";
import { formatOptionPrice, type DesignOptions } from "@/lib/customers/design-options";

/**
 * The customer's systems side by side (approved "three options" layout): the
 * chosen one is ringed in sunrise orange, and each says why it's sized so.
 */
export function DesignChoices({
  options,
  loading,
  savingKey,
  onChoose,
}: {
  options: DesignOptions | null;
  loading: boolean;
  savingKey: string | null;
  onChoose: (key: string) => void;
}) {
  const list = options?.options ?? [];
  const locked = options?.locked ?? false;

  return (
    <section id="designs" aria-labelledby="designs-title" className="flex scroll-mt-24 flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="designs-title" className="m-0 font-source-sans text-[24px] font-extrabold text-[#0F172A]">
            Systems sized for your home
          </h2>
          <p className="m-0 max-w-[680px] text-[14.5px] leading-[1.5] text-[#475569]">
            {locked
              ? "Your system is approved. Talk to us if you'd like to change it."
              : "Each follows the same rules: network limits, inverter sizing, rebates and approved products. Choose one; you can switch any time before it's approved."}
          </p>
        </div>
        <ButtonLink href="/designs" variant="quiet" icon="design">
          Design a new system
        </ButtonLink>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[380px]" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyNote icon="design" title="No designs yet">
          <Link href="/designs" className="font-semibold text-[#1D4ED8]">
            Design your system
          </Link>{" "}
          in about five minutes. It appears here straight away.
        </EmptyNote>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((o) => {
            const on = o.selected || o.key === options?.selectedKey;
            const price = o.priceAfterStc && o.priceAfterStc > 0 ? o.priceAfterStc : o.price;
            const busy = savingKey === o.key;
            return (
              <article
                key={o.key}
                className={`flex flex-col overflow-hidden rounded-[22px] bg-white transition-shadow ${
                  on ? "shadow-[0_0_0_3px_#F68A0A,0_14px_30px_rgba(246,138,10,0.16)]" : "border border-[#E2E8F0] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
                }`}
              >
                <div className="relative h-[132px] bg-[#E8EDF3]">
                  {o.imageSrc ? <Image src={o.imageSrc} alt="" fill sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" className="object-cover" /> : null}
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />
                  <div className="absolute left-3 top-3 flex gap-1.5">
                    {on ? (
                      <span className="flex items-center gap-1 rounded-full bg-[#F68A0A] px-2.5 py-1 text-[12px] font-bold text-[#3B1D00]">
                        <PortalIcon name="check" size={13} /> Selected
                      </span>
                    ) : null}
                    {o.isCustom ? <span className="rounded-full bg-white/90 px-2.5 py-1 text-[12px] font-bold text-[#0B1A2E]">Your design</span> : null}
                  </div>
                </div>
                <div className={`flex flex-col gap-1 px-5 py-4 ${on ? "bg-gradient-to-r from-[#FFE866] to-[#F68A0A]" : "bg-[#F1F5F9]"}`}>
                  <h3 className={`m-0 font-source-sans text-[22px] font-extrabold ${on ? "text-[#3B1D00]" : "text-[#0F172A]"}`}>{o.title}</h3>
                  <p className={`m-0 line-clamp-2 text-[13.5px] font-semibold ${on ? "text-[#4A2600]" : "text-[#475569]"}`}>{o.summary}</p>
                </div>
                <dl className="m-0 flex flex-col gap-2 px-5 pt-4 text-[14px]">
                  {[
                    ["Solar", o.kw > 0 ? `${o.kw.toFixed(1)} kW${o.panelCount > 0 ? ` · ${o.panelCount} panels` : ""}` : "—"],
                    ["Battery", o.batteryKwh && o.batteryKwh > 0 ? `${o.batteryKwh} kWh` : "None — can add later"],
                    ["Output", o.annualOutputKwh > 0 ? `${new Intl.NumberFormat("en-AU").format(o.annualOutputKwh)} kWh/yr` : "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 border-b border-[#EEF2F6] pb-2">
                      <dt className="text-[#5B6B80]">{k}</dt>
                      <dd className="m-0 text-right font-bold text-[#0F172A]">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="grid grid-cols-2 gap-2 px-5 pt-3">
                  <div className="rounded-[12px] bg-[#ECFDF3] px-3 py-2.5">
                    <div className="text-[12px] text-[#166534]">Savings / yr</div>
                    <div className="text-[18px] font-extrabold tabular-nums text-[#14532D]">{o.estimatedSavings > 0 ? formatOptionPrice(o.estimatedSavings) : "—"}</div>
                  </div>
                  <div className="rounded-[12px] bg-[#F4F6FA] px-3 py-2.5">
                    <div className="text-[12px] text-[#5B6B80]">{o.priceAfterStc ? "After STCs" : "Price"}</div>
                    <div className="text-[18px] font-extrabold tabular-nums text-[#0F172A]">{price > 0 ? formatOptionPrice(price) : "—"}</div>
                  </div>
                </div>
                <div className="mt-auto flex flex-col gap-2 p-5 pt-4">
                  {locked ? (
                    on ? (
                      <span className="flex min-h-[48px] items-center justify-center gap-2 rounded-[14px] bg-[#0B1A2E] text-[14.5px] font-bold text-white">
                        <PortalIcon name="lock" size={16} /> Approved
                      </span>
                    ) : null
                  ) : (
                    <button
                      type="button"
                      disabled={on || busy}
                      onClick={() => onChoose(o.key)}
                      className={`min-h-[48px] rounded-[14px] text-[14.5px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] ${
                        on ? "cursor-default bg-[#0B1A2E] text-white" : "border border-[#CBD5E1] bg-white text-[#0F172A] hover:border-[#0B1A2E]"
                      } disabled:opacity-90`}
                    >
                      {busy ? "Saving…" : on ? "Selected" : `Choose ${o.title}`}
                    </button>
                  )}
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[13.5px] font-semibold">
                    {o.isCustom && o.editable && !locked ? (
                      <Link href="/designs" className="text-[#1D4ED8] hover:underline">
                        Edit in builder
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => askEasylinkAi(`Why is the ${o.title} option sized at ${o.kw.toFixed(1)} kW${o.batteryKwh ? ` with a ${o.batteryKwh} kWh battery` : ""}? Is it right for my home?`)}
                      className="flex items-center gap-1 text-[#1D4ED8] hover:underline"
                    >
                      <PortalIcon name="spark" size={14} /> Why this size?
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
