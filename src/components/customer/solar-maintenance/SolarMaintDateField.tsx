"use client";

import { useRef } from "react";
import Icon from "@/components/ui/Icons";

type Props = {
  /** Stored as `yyyy-mm-dd` or empty */
  isoValue: string;
  onIsoChange: (iso: string) => void;
  ariaLabel?: string;
  /** Extra classes on the outer shell (e.g. wizard step 3 styling) */
  className?: string;
};

function isoToDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

export function SolarMaintDateField({
  isoValue,
  onIsoChange,
  ariaLabel,
  className = "",
}: Props) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const display = isoToDisplay(isoValue);

  const openPicker = () => {
    const el = pickerRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      void el.showPicker();
    } else {
      el.click();
    }
  };

  return (
    <div
      className={`relative flex h-[42px] w-full min-w-0 items-center rounded-lg border border-sm-panel-border bg-sm-input-bg px-3 font-inter text-sm leading-5 tracking-[-0.154px] text-sm-heading ${className}`}
    >
      <input
        type="text"
        readOnly
        value={display}
        placeholder="dd/mm/yyyy"
        aria-label={ariaLabel}
        className="min-w-0 flex-1 cursor-pointer bg-transparent outline-none placeholder:text-sm-placeholder"
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") openPicker();
        }}
      />
      <button
        type="button"
        onClick={openPicker}
        className="ml-1 flex size-[18px] shrink-0 items-center justify-center rounded text-sm-muted opacity-85 hover:opacity-100"
        aria-label={
          ariaLabel ? `${ariaLabel}, open calendar` : "Open calendar"
        }
      >
        <Icon name="MaintCalendar" className="size-[14px]" />
      </button>
      <input
        ref={pickerRef}
        type="date"
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        tabIndex={-1}
        value={isoValue}
        onChange={(e) => onIsoChange(e.target.value)}
      />
    </div>
  );
}
