"use client";

import Image from "next/image";
import rightArrow from "@/components/ui/Icons/rightArrow.svg";

export function SolarDesignCtaButton() {
  return (
    <button
      type="button"
      className="flex h-[48px] w-[216px] items-center justify-center gap-[8px] rounded-[12px] shadow-[0px_1px_5.7px_0px_rgba(0,0,0,0.24)]"
      style={{
        backgroundImage:
          "linear-gradient(158.907deg, rgb(84, 116, 235) 16.143%, rgb(255, 60, 60) 99.619%)",
      }}
    >
      <Image
        src="/images/solarDesignLogo.png"
        alt="Solar Design"
        width={37}
        height={37}
      />
      <span className="font-source-sans text-[16px] font-semibold leading-[24.876px] text-white whitespace-nowrap">
        Solar Design
      </span>
      <Image src={rightArrow} alt="" width={17} height={17} />
    </button>
  );
}
