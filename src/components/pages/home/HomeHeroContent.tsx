"use client";

import Image from "next/image";
import Link from "next/link";

import rightArrow from "@/components/ui/Icons/rightArrow.svg";
import { HOME_PAGE } from "@/utils/constant";

export function HomeHeroContent() {
  const { title, subtitle, primaryCta, secondaryCta, stats } = HOME_PAGE.hero;

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-[143px]">
      <div className="flex max-w-[753px] flex-col gap-[10px]">
        <h1 className="font-source-sans text-[32px] font-bold leading-none tracking-[-1.2px] text-home-hero-title sm:text-[48px] sm:leading-[48px]">
          <span className="block">{title.line1}</span>
          <span className="mt-0 flex flex-wrap items-baseline gap-x-[10px]">
            <span className="home-hero-brand-text">{title.brand}</span>
            <span>{title.line2}</span>
          </span>
        </h1>
        <p className="max-w-[551px] font-source-sans text-base font-normal leading-normal tracking-[-0.4008px] text-home-hero-subtitle sm:text-[20px]">
          {subtitle}
        </p>
      </div>

      <div className="flex w-full max-w-[383px] flex-col gap-[14px] lg:items-end">
        <div className="flex items-center gap-2">
          <Link
            href={primaryCta.href}
            className="home-hero-solar-design-cta inline-flex h-12 min-w-0 flex-1 items-center sm:min-w-[186.61px] sm:flex-none justify-center gap-2 rounded-xl border border-home-hero-cta-primary-border px-2 font-source-sans text-base font-semibold leading-[24.876px] tracking-[-0.16px] text-white"
          >
            <Image
              src="/images/solarDesignLogo.png"
              alt=""
              width={37}
              height={37}
            />
            <span>{primaryCta.label}</span>
            <Image src={rightArrow} alt="" width={17} height={17} />
          </Link>
          <Link
            href={secondaryCta.href}
            className="inline-flex h-12 min-w-0 flex-1 items-center justify-center rounded-xl border-2 border-home-hero-cta-secondary-border bg-white px-3 sm:min-w-[188.56px] sm:flex-none sm:px-6 font-source-sans text-base font-semibold leading-6 tracking-[-0.16px] text-home-hero-cta-secondary-text backdrop-blur-[2px]"
          >
            {secondaryCta.label}
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-5 font-source-sans text-base lg:justify-end">
          <div className="flex items-center gap-[7.5px] text-slate-ink">
            <span className="font-bold">{stats[0].value}</span>
            <span className="font-medium">{stats[0].label}</span>
          </div>
          <span
            className="hidden h-[17px] w-px bg-home-hero-stat-divider sm:block"
            aria-hidden
          />
          <div className="flex items-center gap-[8.5px] text-slate-ink">
            <span className="font-bold">{stats[1].value}</span>
            <span className="font-medium">{stats[1].label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
