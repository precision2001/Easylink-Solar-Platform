"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import type { DesignOption } from "./types";
import Icon from "../../ui/Icons";

type Props = {
  option: DesignOption;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  /** Shown on the image, top-left (opposite the Selected badge). */
  imageAction?: ReactNode;
};

export function DesignOptionCard({
  option,
  selected,
  onSelect,
  disabled = false,
  imageAction,
}: Props) {
  return (
    <div
      className={`group flex h-full w-full flex-col overflow-hidden rounded-[14px] border-[3px] text-left transition-[box-shadow,border-color] ${
        selected
          ? "border-orange-amber"
          : "customer-card-border hover:border-customer-border-strong"
      }`}
    >
      <div className="relative flex min-h-0 flex-1 flex-col">
        <button
          type="button"
          onClick={onSelect}
          disabled={disabled}
          aria-pressed={selected}
          className={`flex min-h-0 w-full flex-1 flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-amber focus-visible:ring-offset-2 focus-visible:ring-offset-customer-page-bg ${
            disabled ? "cursor-not-allowed opacity-70" : ""
          }`}
        >
          <div className="shrink-0 bg-customer-design-image-bg">
            <div className="relative aspect-[436/80] w-full">
              <Image
                src={option.imageSrc}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                unoptimized
              />
            </div>
          </div>

          <div className="customer-gradient-accent-h flex min-h-0 flex-1 flex-col px-4 pb-3 pt-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-inter text-sm font-semibold leading-[21px] tracking-[-0.15px] text-warm-ink">
                {option.title}
              </p>
              {option.badge === "approved" ? (
                <span className="shrink-0 rounded-full bg-mint-soft px-2 py-0.5 font-inter text-[8px] font-bold uppercase leading-3 tracking-[0.61px] text-success">
                  Approved
                </span>
              ) : (
                <span className="customer-draft-badge shrink-0 rounded-full px-2 py-0.5 font-inter text-[8px] font-bold uppercase leading-3 tracking-[0.61px]">
                  Draft
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-inter text-[11px] font-normal leading-[16.5px] tracking-[0.06px] text-customer-card-spec-text">
              <span>{option.kw}</span>
              <span className="opacity-50">·</span>
              <span>{option.panels}</span>
              <span className="opacity-50">·</span>
              <span className="font-semibold text-warm-black">{option.price}</span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] leading-[15px] tracking-[0.12px] text-customer-card-spec-text">
              <span>
                Savings:{" "}
                <span className="font-bold text-success">{option.savingsPerYr}</span>
              </span>
              <span className="opacity-50">·</span>
              <span>Output: {option.outputKwh}</span>
            </div>

            {option.equipment || option.afterStc ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] leading-[15px] tracking-[0.12px] text-customer-card-spec-text">
                {option.equipment ? <span>{option.equipment}</span> : null}
                {option.equipment && option.afterStc ? <span className="opacity-50">·</span> : null}
                {option.afterStc ? (
                  <span>
                    After STCs: <span className="font-bold text-warm-black">{option.afterStc}</span>
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </button>

        {imageAction ? (
          <div className="pointer-events-none absolute left-2 top-2 z-10 max-w-[calc(100%-5.5rem)]">
            <div className="pointer-events-auto drop-shadow-sm">{imageAction}</div>
          </div>
        ) : null}

        {selected ? (
          <div
            className="customer-gradient-accent-h pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full px-2 py-0.5 pl-2 text-warm-black"
            aria-hidden
          >
            <Icon name="CheckCircle" className="size-3 text-warm-black" />
            <span className="font-inter text-[9px] font-bold uppercase leading-3 tracking-[0.62px] text-warm-black">
              Selected
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
