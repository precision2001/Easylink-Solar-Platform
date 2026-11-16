import Icon, { IconType } from "../../ui/Icons";

type Props = {
  label: string;
  value: string;
  sublabel: string;
  icon: IconType;
  iconTintClass: string;
};

export function DashboardKpiCard({
  label,
  value,
  sublabel,
  icon,
  iconTintClass,
}: Props) {
  return (
    <div className="customer-card-bg customer-card-border flex min-h-[126px] flex-col rounded-[14px] border p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-inter text-[11px] font-normal leading-[16.5px] tracking-[0.06px] customer-text-muted">
          {label}
        </span>
        <div
          className={`flex size-7 shrink-0 items-center justify-center rounded-[10px] ${iconTintClass}`}
        >
          <Icon name={icon} className="size-4 text-orange-amber" />
        </div>
      </div>
      <p className="mt-3 font-inter text-2xl font-bold leading-8 tracking-[0.07px] customer-text-on-dark">
        {value}
      </p>
      <p className="mt-1 font-inter text-[10px] font-normal leading-[15px] tracking-[0.12px] customer-text-faint">
        {sublabel}
      </p>
    </div>
  );
}
