"use client";

import Link from "next/link";

import { MasterDesignerBody } from "@/components/master-dashboard/MasterDesignerBody";

/**
 * Matches the Easylink Designer "Installer · Solar designer" mock
 * (InstDesigner.dc.html).
 *
 * That artboard is a thin wrapper: the sidebar, a breadcrumb, and
 * `<dc-import name="DesignerBody" role="installer" start="7">`. DesignerBody
 * is the same component the Operations artboard imports, and it is already
 * built here — role-aware, with "installer" selecting Daniel Moretti's
 * profile and the nine-step wizard opening on Equipment. So this page is the
 * wrapper only; the designer itself is reused rather than duplicated.
 *
 * The sidebar comes from the installer dashboard layout, so it is not
 * repeated here.
 */
export default function InstallerSolarDesignerPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6FA] text-[#0F172A]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-7 py-3.5">
        <nav aria-label="Breadcrumb" className="grow text-[13px] text-[#5B6B80]">
          <Link
            href="/installers/dashboard/customers"
            prefetch={false}
            className="text-[#5B6B80] no-underline hover:text-[#0F172A]"
          >
            Customers
          </Link>{" "}
          <span aria-hidden="true">/</span>{" "}
          {/* The per-customer page isn't built yet, so this reads as text. */}
          <span title="Not built yet" className="cursor-help underline">
            Daniel Moretti
          </span>{" "}
          <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Solar designer</span>
        </nav>
        <span className="text-[12px] text-[#475569]">
          Editing option: Recommended
        </span>
        <span className="rounded-full bg-[#DBEAFE] px-2.5 py-0.75 text-[12px] font-bold text-[#1E40AF]">
          Sample data
        </span>
      </header>
      <MasterDesignerBody role="installer" start={7} />
    </div>
  );
}
