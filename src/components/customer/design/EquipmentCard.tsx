import type { EquipmentCardData } from "./designConstants";
import Icon from "@/components/ui/Icons";

type Props = {
  card: EquipmentCardData;
};

export function EquipmentCard({ card }: Props) {
  return (
    <div className="flex min-h-[150px] flex-col gap-3 rounded-[10px] border border-warm-border bg-gradient-to-r from-yellow-lemon to-orange-amber p-3.5">
      <div className="flex items-center gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-navy-800/16 bg-linear-to-b from-yellow-lemon to-orange-amber">
          <Icon
            name={card.iconName}
            className="size-4 shrink-0 text-black"
            aria-hidden
          />
        </div>
        <h3 className="font-inter text-xs font-bold uppercase leading-[18px] tracking-[0.3px] text-warm-ink">
          {card.title}
        </h3>
      </div>
      <div className="flex flex-col gap-1">
        {card.rows.map((row) => (
          <div
            key={row.label}
            className="flex items-start justify-between gap-2 text-xs"
          >
            <span
              className="font-dm-sans font-normal text-warm-gray"
              style={{ fontVariationSettings: "'opsz' 9" }}
            >
              {row.label}
            </span>
            <span
              className="text-right font-dm-sans font-medium text-warm-ink"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
