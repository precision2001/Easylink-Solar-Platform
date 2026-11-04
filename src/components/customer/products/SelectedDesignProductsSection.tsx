import { CustomerSectionHeader } from "@/components/customer/CustomerSectionHeader";
import type { DesignSummaryItem } from "./types";
import Icon from "@/components/ui/Icons";

type Props = {
  items: DesignSummaryItem[];
};

export function SelectedDesignProductsSection({ items }: Props) {
  return (
    <section className="customer-cream-card-bg customer-cream-card-border overflow-hidden rounded-[10px] border">
      <CustomerSectionHeader
        variant="cream"
        title="Products in your selected design"
        icon={
          <Icon
            name="CheckCircle"
            className="size-4 shrink-0 text-success"
            aria-hidden
          />
        }
      />
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex min-h-[68px] items-center gap-3 rounded-lg border customer-cream-card-border bg-white px-3 py-2"
          >
            <div className="customer-gradient-accent-v flex size-8 shrink-0 items-center justify-center rounded-lg">
              <Icon
                name={item.icon === "sun" ? "MyDesignSun" : "MyDesignsInverter"}
                className="size-4 shrink-0 text-black"
                aria-hidden
              />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="font-dm-sans text-xs font-semibold leading-[18px] text-warm-ink"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                {item.name}
              </p>
              <p
                className="mt-1 font-dm-sans text-[10px] font-normal leading-[15px] text-warm-gray"
                style={{ fontVariationSettings: "'opsz' 9" }}
              >
                {item.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
