"use client";

import Image from "next/image";
import { useState } from "react";
import { designAssets } from "./designAssets";

export function DesignPageToolbar() {
  const [installerView, setInstallerView] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* <button
        type="button"
        aria-pressed={installerView}
        onClick={() => setInstallerView((v) => !v)}
        className={`inline-flex h-7 items-center gap-2 rounded-md border px-3 font-dm-sans text-[10px] font-semibold uppercase tracking-[0.3px] transition-colors ${
          installerView
            ? "border-customer-border-strong bg-navy-800 text-white"
            : "customer-cream-card-border bg-cream-50 text-warm-gray hover:bg-cream-150"
        }`}
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        <Image
          src={designAssets.sun}
          alt=""
          width={12}
          height={12}
          className="size-3 shrink-0"
          unoptimized
        />
        Installer View
      </button>
      <button
        type="button"
        className="inline-flex h-7 items-center gap-2 rounded-md border border-customer-border-strong bg-navy-800 px-3 font-dm-sans text-[10px] font-semibold uppercase tracking-[0.3px] text-white"
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        <Image
          src={designAssets.user}
          alt=""
          width={12}
          height={12}
          className="size-3 shrink-0 opacity-90"
          unoptimized
        />
        Distributor Dashboard
      </button> */}
    </div>
  );
}
