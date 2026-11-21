"use client";

import type { SolarProductCategory } from "./types";

export type FilterValue = "all" | SolarProductCategory;

const OPTIONS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "panel", label: "Panel" },
  { value: "inverter", label: "Inverter" },
  { value: "battery", label: "Battery" },
  { value: "ev-charger", label: "EV charger" },
  { value: "heat-pump", label: "Heat pump" },
  { value: "portable-power", label: "Portable power" },
];

type Props = {
  value: FilterValue;
  onChange: (next: FilterValue) => void;
};

export function CategoryFilterChips({ value, onChange }: Props) {
  return (
    <div
      className="customer-cream-card-bg customer-cream-card-border inline-flex flex-wrap gap-1 rounded-lg border p-1"
      role="group"
      aria-label="Filter by category"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-md px-3 py-1.5 font-dm-sans text-[10px] font-semibold uppercase leading-[15px] tracking-[0.3px] transition-colors ${
              active
                ? "customer-chip-active"
                : "text-warm-gray hover:bg-black/[0.04]"
            }`}
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
