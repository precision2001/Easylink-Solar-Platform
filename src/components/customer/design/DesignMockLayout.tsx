"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { PortalIcon, type PortalIconName } from "@/components/customer/portal/PortalIcon";
import type { CustomerDesign, CustomerDesignProduct } from "@/lib/customers/designs";
import {
  aud,
  kwLabel,
  kwhLabel,
  priceBasisLabel,
  type DesignSpecSheet,
} from "@/lib/customers/design-spec-sheet";
import {
  batteryCapacityKwh,
  inverterRatedKw,
  productImage,
  productLabel,
} from "@/lib/designs/product-specs";

/**
 * The "My design" layout from the Easylink Designer mock (CustDesign.dc.html),
 * driven by the customer's real design rather than the mock's sample values.
 *
 * The mock shows every figure as a placeholder — "$[price]", "14.52 kW",
 * "33 × AXITEC" — because the artboard has no data behind it. This app does:
 * the same page already resolves a real roof photo, real product models, a
 * real price and a real annual output. So this is the mock's arrangement over
 * live values, and a figure only falls back to "At quote" when the design
 * genuinely does not carry it yet.
 *
 * Two things in the mock have no source and are not invented here:
 *
 * - Per-item "Datasheet" links. Nothing stores a datasheet URL per product, so
 *   a link would 404; the card shows the product's own specs instead.
 * - Orientation, tilt, network and NMI. These are not on the design model, so
 *   those rows are left out rather than filled with plausible-looking text on
 *   a page the installer works from.
 */

const SUN = "#F68A0A";
const INK = "#0F172A";
const MUTED = "#5B6B80";
const SLATE = "#475569";
const BORDER = "#E3E8EF";
const AMBER = "#92400E";

const AT_QUOTE = "At quote";

type Row = { key: string; value: ReactNode };

function SpecList({ rows }: { rows: Row[] }) {
  return (
    <dl className="m-0 grid flex-1 basis-65 grid-cols-[auto_1fr] content-start gap-x-3.5 gap-y-2 text-[13px]">
      {rows.map((r) => (
        <div key={r.key} className="contents">
          <dt style={{ color: MUTED }}>{r.key}</dt>
          <dd className="m-0 font-semibold">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function iconFor(category: string): PortalIconName {
  const c = category.toLowerCase();
  if (c.includes("battery")) return "battery";
  if (c.includes("inverter") || c.includes("ev")) return "bolt";
  if (c.includes("panel")) return "sun";
  return "products";
}

/** The one-line spec under a product name, from what the product stores. */
function keySpec(item: CustomerDesignProduct): string | null {
  const c = item.product?.category.toLowerCase() ?? "";
  if (c.includes("panel") && item.product?.wattage) {
    return `${item.product.wattage} W each`;
  }
  if (c.includes("battery")) {
    const kwh = batteryCapacityKwh(item);
    return kwh ? kwhLabel(kwh) : null;
  }
  if (c.includes("inverter") || c.includes("ev")) {
    const kw = inverterRatedKw(item);
    return kw ? `${kw} kW` : null;
  }
  return null;
}

/**
 * The mock's equipment cards: a white card with a thick sun-coloured top
 * border, the category in small caps, the model, and its key spec.
 */
export function DesignEquipmentCards({ design }: { design: CustomerDesign }) {
  const items = (design.products ?? []).filter((i) => i.product);
  const address = design.address?.trim();

  if (items.length === 0 && !address) return null;

  return (
    <section aria-label="Your equipment" className="flex flex-col gap-2.5">
      <h2 className="m-0 text-[16px] font-bold">Your equipment</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const img = productImage(item.product);
          const spec = keySpec(item);
          return (
            <div
              key={item.id}
              className="flex flex-col gap-1.5 rounded-[14px] bg-white p-3.5"
              style={{ border: `1px solid ${BORDER}`, borderTop: `4px solid ${SUN}` }}
            >
              <div className="flex items-center gap-2">
                <strong
                  className="grow text-[12px] tracking-[0.06em] uppercase"
                  style={{ color: INK }}
                >
                  {item.product!.category}
                </strong>
                <span
                  className="text-[12px] font-semibold tabular-nums"
                  style={{ color: SLATE }}
                >
                  × {item.quantity}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                {img ? (
                  <span className="relative size-9 shrink-0 overflow-hidden rounded-[10px] bg-[#F4F6FA]">
                    <Image
                      src={img.thumbUrl}
                      alt=""
                      fill
                      sizes="36px"
                      className="object-contain p-1"
                      unoptimized
                    />
                  </span>
                ) : (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#F4F6FA] text-[#0B1A2E]">
                    <PortalIcon name={iconFor(item.product!.category)} size={18} />
                  </span>
                )}
                <span className="min-w-0 break-words text-[14px] font-semibold">
                  {productLabel(item)}
                </span>
              </div>
              {spec ? (
                <span className="text-[12px]" style={{ color: MUTED }}>
                  {spec}
                </span>
              ) : null}
            </div>
          );
        })}

        {address ? (
          <div
            className="flex flex-col gap-1.5 rounded-[14px] bg-white p-3.5"
            style={{ border: `1px solid ${BORDER}`, borderTop: `4px solid ${SUN}` }}
          >
            <strong className="text-[12px] tracking-[0.06em] uppercase">
              Site details
            </strong>
            <span className="text-[14px] font-semibold">{address}</span>
            <a
              href="/customers/profile"
              className="text-[12px] font-semibold text-[#1565C0]"
            >
              Update my details
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/**
 * The mock's two specification columns, built from the live spec sheet.
 *
 * Rows the design does not carry are dropped rather than shown as a
 * placeholder: an empty "Orientation" row teaches the reader nothing, and a
 * filled-in one would be invented.
 */
export function DesignSpecColumns({ sheet }: { sheet: DesignSpecSheet }) {
  const specs: Row[] = [];
  if (sheet.kw) {
    specs.push({
      key: "System size",
      value: `${kwLabel(sheet.kw)} DC${
        sheet.inverterKw ? ` · ${sheet.inverterKw} kW AC` : ""
      }`,
    });
  }
  if (sheet.panelCount) {
    specs.push({
      key: "Panels",
      value: `${sheet.panelCount}${sheet.panelWatts ? ` × ${sheet.panelWatts} W` : ""}${
        sheet.panelModel ? ` ${sheet.panelModel}` : ""
      }`,
    });
  }
  if (sheet.inverterModel) {
    specs.push({ key: "Inverter", value: sheet.inverterModel });
  }
  specs.push({
    key: "Battery",
    value: sheet.batteryKwh
      ? `${sheet.batteryModel ? `${sheet.batteryModel} · ` : ""}${kwhLabel(sheet.batteryKwh)}`
      : sheet.hasBattery
        ? AT_QUOTE
        : "None — can be added later",
  });

  const perf: Row[] = [];
  if (sheet.annualKwh) {
    const annual = new Intl.NumberFormat("en-AU").format(Math.round(sheet.annualKwh));
    const daily = new Intl.NumberFormat("en-AU", {
      maximumFractionDigits: 1,
    }).format(sheet.annualKwh / 365);
    perf.push({ key: "Annual output", value: `≈ ${annual} kWh (estimate)` });
    perf.push({ key: "Daily output", value: `≈ ${daily} kWh` });
  }
  perf.push({
    key: "Est. savings",
    value: sheet.savingsPerYear ? `${aud(sheet.savingsPerYear)} a year` : "After bill upload",
  });
  perf.push({
    key: "Your price",
    value: sheet.price
      ? `${aud(sheet.price)} · ${priceBasisLabel(sheet.priceBasis)}`
      : "In your proposal",
  });
  if (sheet.stcDiscount) {
    perf.push({ key: "Rebate (STC)", value: `${aud(sheet.stcDiscount)} off` });
  }
  if (sheet.paybackYears) {
    perf.push({
      key: "Payback",
      value: `about ${Math.round(sheet.paybackYears)} years`,
    });
  }

  return (
    <>
      <SpecList rows={specs} />
      <SpecList rows={perf} />
    </>
  );
}

/** Above this, the STC rules will not approve the design. */
export const STC_RATIO_LIMIT = 133;

/**
 * The amber banner the mock shows when the selected design is over the STC
 * ratio. Rendered only when the real design actually is.
 */
export function StcRatioWarning({
  ratio,
  panelCount,
  inverterKw,
}: {
  ratio: number;
  panelCount?: number;
  inverterKw?: number;
}) {
  return (
    <p
      role="status"
      className="m-0 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold"
      style={{ background: "#FFFBEB", color: AMBER }}
    >
      {panelCount ? `${panelCount} panels` : "This design"}
      {inverterKw ? ` on a ${inverterKw} kW inverter` : ""} is {Math.round(ratio)}% of
      inverter size. Rebate (STC) rules allow up to {STC_RATIO_LIMIT}%, so this design
      can&rsquo;t be approved as is — ask your installer for a change.
    </p>
  );
}

