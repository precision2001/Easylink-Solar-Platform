"use client";

import Icon from "@/components/ui/Icons";

type Option = { value: string; label: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: readonly Option[];
  ariaLabel?: string;
};

export function SolarMaintNativeSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: Props) {
  return (
    <div className="relative">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="solar-maint-wizard-combobox-shadow h-9 w-full cursor-pointer appearance-none rounded-lg border border-sm-wizard-combobox-border bg-transparent py-0 pl-3 pr-9 font-inter text-sm leading-5 tracking-[-0.154px] text-sm-wizard-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-sm-wizard-nav-blue/40"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="text-ink">
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm-wizard-slate-500">
        <Icon name="ChevronDown" className="size-4" />
      </span>
    </div>
  );
}
