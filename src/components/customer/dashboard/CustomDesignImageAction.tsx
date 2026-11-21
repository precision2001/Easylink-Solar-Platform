"use client";

import Link from "next/link";
import Icon from "@/components/ui/Icons";
import type { DesignOptionCard as DesignOptionCardData } from "@/lib/customers/design-options";

const actionLinkClass =
  "group/action inline-flex max-w-full items-center gap-1.5 rounded-full customer-gradient-accent-h px-2.5 py-1 shadow-[0_2px_10px_rgba(247,141,0,0.38),0_1px_3px_rgba(0,0,0,0.14)] ring-1 ring-inset ring-white/55 backdrop-blur-[2px] transition-[transform,box-shadow,filter] duration-200 hover:scale-[1.03] hover:brightness-[1.03] hover:shadow-[0_4px_16px_rgba(247,141,0,0.48),0_2px_4px_rgba(0,0,0,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-amber focus-visible:ring-offset-2 focus-visible:ring-offset-customer-page-bg active:scale-[0.98]";

const actionLabelClass =
  "truncate font-inter text-[9px] font-bold uppercase leading-3 tracking-[0.62px] text-warm-black";

type Props = {
  option: DesignOptionCardData;
};

export function CustomDesignImageAction({ option }: Props) {
  if (!option.isCustom) return null;

  if (option.editable) {
    return (
      <Link
        href="/designs"
        onClick={(e) => e.stopPropagation()}
        className={actionLinkClass}
        aria-label="Edit in design builder"
      >
        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-warm-black/10">
          <Icon name="Pencil" className="size-2.5 text-warm-black" />
        </span>
        <span className={actionLabelClass}>Edit in builder</span>
        <Icon
          name="ArrowUpRight"
          className="size-2.5 shrink-0 text-warm-black/60 transition-transform duration-200 group-hover/action:translate-x-0.5 group-hover/action:-translate-y-0.5 group-hover/action:text-warm-black"
        />
      </Link>
    );
  }

  if (option.designId) {
    return (
      <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-customer-page-bg/90 px-2.5 py-1 shadow-sm backdrop-blur-sm">
        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-white/10">
          <Icon name="Lock" className="size-2.5 text-customer-card-spec-text" />
        </span>
        <span className="truncate font-inter text-[9px] font-semibold leading-3 tracking-[0.04px] text-customer-card-spec-text">
          Approved — locked
        </span>
      </span>
    );
  }

  return (
    <Link
      href="/designs"
      onClick={(e) => e.stopPropagation()}
      className={actionLinkClass}
      aria-label="Build your own design"
    >
      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-warm-black/10">
        <Icon name="Sparkles" className="size-2.5 text-warm-black" />
      </span>
      <span className={actionLabelClass}>Build your design</span>
      <Icon
        name="ArrowUpRight"
        className="size-2.5 shrink-0 text-warm-black/60 transition-transform duration-200 group-hover/action:translate-x-0.5 group-hover/action:-translate-y-0.5 group-hover/action:text-warm-black"
      />
    </Link>
  );
}
