"use client";

import Link from "next/link";

import { MasterPriceBook } from "@/components/master-dashboard/MasterPriceBook";

/**
 * Matches the Easylink Designer "Installer · My rates & margin" mock
 * (InstRates.dc.html).
 *
 * That artboard is a thin wrapper: the sidebar, a breadcrumb, and
 * `<dc-import name="PricingBody" role="installer" screen="book">`. PricingBody
 * at screen "book" is the same component the Operations artboard imports for
 * its price book, so it is reused here at role "installer" rather than
 * duplicated.
 *
 * The sidebar comes from the installer dashboard layout, so it is not
 * repeated here.
 */
export default function InstallerMyRatesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6FA] text-[#0F172A]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="grow text-[13px] text-[#5B6B80]">
          <Link
            href="/installers/dashboard/pricing-engine"
            prefetch={false}
            className="text-[#5B6B80] no-underline hover:text-[#0F172A]"
          >
            Pricing engine
          </Link>{" "}
          <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">My rates &amp; margin</span>
        </nav>
        <span className="rounded-full bg-[#DBEAFE] px-2.5 py-0.75 text-[12px] font-bold text-[#1E40AF]">
          Sample price book
        </span>
        <span
          className="rounded-full px-2.5 py-0.75 text-[12px] font-bold"
          style={{ background: "linear-gradient(90deg, #FFE866, #F68A0A)", color: "#3B1D00" }}
        >
          Pricing engine
        </span>
      </header>
      <MasterPriceBook role="installer" />
    </div>
  );
}
