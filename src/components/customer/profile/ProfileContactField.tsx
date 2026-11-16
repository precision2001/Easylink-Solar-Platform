import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  label: string;
  value: string;
};

export function ProfileContactField({ icon, label, value }: Props) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <span className="flex size-3 shrink-0 items-center justify-center [&_img]:size-3">
          {icon}
        </span>
        <span
          className="font-dm-sans text-[9px] font-normal uppercase leading-[13.5px] tracking-[0.3px] text-warm-gray"
          style={{ fontVariationSettings: "'opsz' 9" }}
        >
          {label}
        </span>
      </div>
      <p
        className="pl-[18px] font-dm-sans text-xs font-medium leading-[18px] text-warm-ink"
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        {value}
      </p>
    </div>
  );
}
