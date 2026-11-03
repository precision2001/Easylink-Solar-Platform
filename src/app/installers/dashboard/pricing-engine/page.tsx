"use client";

import Link from "next/link";

import { MasterQuoteTester } from "@/components/master-dashboard/MasterQuoteTester";

/**
 * Matches the Easylink Designer "Installer · Pricing engine" mock
 * (InstPricing.dc.html).
 *
 * That artboard is a thin wrapper: the sidebar, a breadcrumb, and
 * `<dc-import name="PricingBody" role="installer" screen="quote">`.
 * PricingBody is the same component the Operations artboard imports, and it
 * is already built here on the tested engine in @/lib/pricing/quote-engine,
 * so this page is the wrapper and the body is reused at role "installer".
 *
 * The sidebar comes from the installer dashboard layout, so it is not
 * repeated here.
 */
export default function InstallerPricingEnginePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6FA] text-[#0F172A]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="grow text-[13px] text-[#5B6B80]">
          <Link
            href="/installers/dashboard/solar-designer"
            prefetch={false}
            className="text-[#5B6B80] no-underline hover:text-[#0F172A]"
          >
            Design &amp; Sizing
          </Link>{" "}
          <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Pricing engine</span>
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
      <MasterQuoteTester role="installer" />
    </div>
  );
}
