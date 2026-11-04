"use client";

import { askEasylinkAi } from "@/components/ai-chat/EasylinkAiChatbot";
import { ProductImageTile } from "@/components/customer/products/ProductImageTile";
import { PortalIcon } from "@/components/customer/portal/PortalIcon";
import { ButtonLink, Skeleton } from "@/components/customer/portal/PortalParts";
import {
  SHOP_CATEGORY_LABEL,
  describeSystem,
  designLineQuestion,
  type DesignSystemSize,
  type SystemLine,
} from "@/lib/customers/shop-products";

/**
 * The one bold card on the Products screen: the products in the customer's
 * selected design, and the obvious next add-on when the design has no battery.
 */
export function ForYourSystemSection({
  loading,
  designTitle,
  lines,
  size,
  batteriesInShop,
  onBrowseBatteries,
}: {
  loading: boolean;
  designTitle: string | null;
  lines: SystemLine[];
  size: DesignSystemSize;
  batteriesInShop: number;
  onBrowseBatteries: () => void;
}) {
  const system = describeSystem(size);
  const hasDesign = lines.length > 0;
  const showBatteryNudge = hasDesign && !size.batteryKwh && batteriesInShop > 0;

  return (
    <section aria-labelledby="for-system" className="relative flex flex-col gap-5 overflow-hidden rounded-[22px] bg-[#0B1A2E] p-6 text-white sm:p-7">
      <svg aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-[240px] w-[240px] text-[#F68A0A] opacity-[0.14]" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="34" fill="currentColor" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * Math.PI) / 6;
          return <line key={i} x1={r2(100 + Math.cos(a) * 50)} y1={r2(100 + Math.sin(a) * 50)} x2={r2(100 + Math.cos(a) * 82)} y2={r2(100 + Math.sin(a) * 82)} stroke="currentColor" strokeWidth="8" strokeLinecap="round" />;
        })}
      </svg>

      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[640px] flex-col gap-2">
          <p className="m-0 flex items-center gap-2 text-[13px] font-bold text-[#FFE866]">
            <PortalIcon name="sun" size={16} />
            For your system
          </p>
          {loading ? (
            <Skeleton className="h-9 w-72 bg-white/10" />
          ) : (
            <>
              <h2 id="for-system" className="m-0 font-source-sans text-[25px] font-extrabold leading-[1.2] sm:text-[28px]">
                {hasDesign ? (size.solarKw ? `Your ${describeKw(size.solarKw)} kW system` : designTitle || "Your system") : "Start with your system"}
              </h2>
              <p className="m-0 text-[14.5px] leading-[1.55] text-[#D6E1F0]">
                {hasDesign
                  ? `What's in ${designTitle ? `“${designTitle}”` : "your design"}. These are priced in your quote, so there's nothing to add to the cart.`
                  : "Design your system first and the products picked for your roof show here, with what goes well with them."}
              </p>
            </>
          )}
        </div>
        {!loading ? (
          <div className="flex flex-wrap gap-2.5">
            {hasDesign ? (
              <ButtonLink href="/customers/design" variant="ghost-dark" icon="arrow">
                See my design
              </ButtonLink>
            ) : (
              <ButtonLink href="/designs" icon="arrow">
                Design my system
              </ButtonLink>
            )}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="relative grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[92px] bg-white/10" />
          ))}
        </div>
      ) : hasDesign ? (
        <ul className="relative m-0 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
          {lines.map((line) => (
            <li key={line.lineId} className="flex items-center gap-3 rounded-[16px] bg-white p-3 text-[#0F172A]">
              <ProductImageTile imageUrl={line.product.imageUrl} category={line.product.category} alt="" compact className="size-[64px] shrink-0 rounded-[12px] border border-[#EEF2F6]" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[12.5px] text-[#5B6B80]">
                  {SHOP_CATEGORY_LABEL[line.product.category].one}
                  {line.product.keySpec ? ` · ${line.product.keySpec}` : ""}
                </span>
                <span className="line-clamp-2 text-[14.5px] font-bold leading-[1.3] [overflow-wrap:anywhere]">{line.product.fullName}</span>
                <button
                  type="button"
                  onClick={() => askEasylinkAi(designLineQuestion(line, size))}
                  className="-ml-1 flex min-h-[44px] items-center gap-1 self-start rounded-[8px] px-1 text-[13px] font-semibold text-[#1D4ED8] hover:underline focus-visible:outline-2 focus-visible:outline-[#2563EB]"
                >
                  <PortalIcon name="spark" size={14} className="text-[#F68A0A]" />
                  Why this one?
                </button>
              </div>
              <span className="shrink-0 self-start rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[13px] font-bold tabular-nums text-[#0F172A]">× {line.quantity}</span>
            </li>
          ))}
          {showBatteryNudge ? (
            <li className="flex flex-col justify-between gap-3 rounded-[16px] bg-gradient-to-r from-[#FFE866] to-[#F68A0A] p-4 text-[#3B1D00]">
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-1.5 text-[14.5px] font-extrabold">
                  <PortalIcon name="battery" size={18} />
                  No battery yet
                </span>
                <span className="text-[13.5px] leading-[1.45] text-[#4A2600]">
                  A battery stores your daytime solar for the evening. Add one now or any time later.
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onBrowseBatteries}
                  className="min-h-[44px] rounded-[12px] bg-[#0B1A2E] px-4 text-[14px] font-bold text-white hover:bg-[#16304F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1A2E]"
                >
                  Browse batteries
                </button>
                <button
                  type="button"
                  onClick={() => askEasylinkAi(`Which battery suits me? I have a ${system ?? "solar system"} and no battery yet. What size should I look at?`)}
                  className="flex min-h-[44px] items-center gap-1.5 rounded-[12px] px-2 text-[14px] font-bold text-[#3B1D00] hover:bg-black/[0.06] focus-visible:outline-2 focus-visible:outline-[#0B1A2E]"
                >
                  <PortalIcon name="spark" size={16} />
                  Which size?
                </button>
              </div>
            </li>
          ) : null}
        </ul>
      ) : (
        <div className="relative flex flex-wrap items-center gap-3 rounded-[16px] bg-white/[0.07] p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#FFE866]">
            <PortalIcon name="design" size={20} />
          </span>
          <p className="m-0 min-w-0 flex-1 text-[14px] leading-[1.5] text-[#D6E1F0]">
            Not sure what you need? EasyLink AI can suggest a size from your bill and roof.
          </p>
          <button
            type="button"
            onClick={() => askEasylinkAi("What size solar system and battery do I need for my home?")}
            className="flex min-h-[44px] items-center gap-1.5 rounded-[12px] border border-[#3E5A80] px-4 text-[14px] font-bold text-white hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFE866]"
          >
            <PortalIcon name="spark" size={16} className="text-[#FFE866]" />
            Ask what size I need
          </button>
        </div>
      )}
    </section>
  );
}

function describeKw(kw: number): string {
  return new Intl.NumberFormat("en-AU", { maximumFractionDigits: 1 }).format(kw);
}

/** Rounded so server and browser render identical SVG coordinates (no hydration mismatch). */
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}
