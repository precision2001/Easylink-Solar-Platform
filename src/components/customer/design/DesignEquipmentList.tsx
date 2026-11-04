import Image from "next/image";
import { PortalIcon, type PortalIconName } from "@/components/customer/portal/PortalIcon";
import { EmptyNote, Panel } from "@/components/customer/portal/PortalParts";
import type { CustomerDesign } from "@/lib/customers/designs";
import { batteryCapacityKwh, inverterRatedKw, productImage, productLabel } from "@/lib/designs/product-specs";

function iconFor(category: string): PortalIconName {
  const c = category.toLowerCase();
  if (c.includes("battery")) return "battery";
  if (c.includes("inverter") || c.includes("ev")) return "bolt";
  if (c.includes("panel")) return "sun";
  return "products";
}

function keySpec(item: NonNullable<CustomerDesign["products"]>[number]): string | null {
  const c = item.product?.category.toLowerCase() ?? "";
  if (c.includes("panel") && item.product?.wattage) return `${item.product.wattage} W each`;
  if (c.includes("battery")) {
    const kwh = batteryCapacityKwh(item);
    return kwh ? `${new Intl.NumberFormat("en-AU", { maximumFractionDigits: 1 }).format(kwh)} kWh` : null;
  }
  if (c.includes("inverter") || c.includes("ev")) {
    const kw = inverterRatedKw(item);
    return kw ? `${kw} kW` : null;
  }
  return null;
}

/** Every product attached to the design, as stored. */
export function DesignEquipmentList({ design }: { design: CustomerDesign }) {
  const items = (design.products ?? []).filter((i) => i.product);
  return (
    <Panel title="What's in your system" meta={design.address?.trim() || undefined}>
      {items.length === 0 ? (
        <EmptyNote icon="products" title="Equipment confirmed at quote">
          Your installer adds the exact panels, inverter and battery models when they prepare your quote.
        </EmptyNote>
      ) : (
        <ul className="m-0 grid list-none gap-2.5 p-0 sm:grid-cols-2">
          {items.map((item) => {
            const img = productImage(item.product);
            const spec = keySpec(item);
            return (
              <li key={item.id} className="flex items-center gap-3 rounded-[14px] bg-[#F4F6FA] p-3">
                <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-white text-[#0B1A2E]">
                  {img ? <Image src={img.thumbUrl} alt="" fill sizes="48px" className="object-contain p-1" unoptimized /> : <PortalIcon name={iconFor(item.product!.category)} size={22} />}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[12.5px] text-[#5B6B80]">{item.product!.category}</span>
                  <span className="break-words text-[14.5px] font-bold text-[#0F172A]">{productLabel(item)}</span>
                  {spec ? <span className="text-[12.5px] text-[#475569]">{spec}</span> : null}
                </div>
                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[13px] font-bold tabular-nums text-[#0F172A]">× {item.quantity}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
