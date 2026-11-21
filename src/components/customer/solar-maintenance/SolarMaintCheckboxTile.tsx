"use client";

import Icon from "@/components/ui/Icons";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id: string;
};

export function SolarMaintCheckboxTile({
  checked,
  onChange,
  label,
  id,
}: Props) {
  return (
    <label
      htmlFor={id}
      className="flex h-[46px] cursor-pointer items-center gap-3 rounded-[10px] border border-sm-wizard-surface-10 bg-sm-wizard-surface-5 px-4 font-inter text-sm leading-5 tracking-[-0.154px] text-sm-wizard-slate-200"
    >
      <span
        className={`grid size-4 shrink-0 place-items-center rounded-md border ${
          checked
            ? "border-sm-wizard-checkbox-blue bg-sm-wizard-checkbox-blue"
            : "border-sm-wizard-checkbox-blue bg-transparent"
        }`}
      >
        {checked ? (
          <Icon name="Check" className="size-3 text-white" />
        ) : null}
      </span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span>{label}</span>
    </label>
  );
}
