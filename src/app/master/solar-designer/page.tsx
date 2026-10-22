"use client";

import { MasterDesignerBody } from "@/components/master-dashboard/MasterDesignerBody";
import { MasterDistSidebar } from "@/components/master-dashboard/MasterDistSidebar";

export default function MasterSolarDesignerPage() {
  return (
    <div className="flex min-h-screen flex-wrap bg-[#F4F6FA] text-[#0F172A]">
      <div className="w-full basis-[248px] md:flex-[1_1_248px]">
        <MasterDistSidebar active="designs" />
      </div>
      <main className="flex min-w-0 flex-[999_1_560px] flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-7 py-3.5">
          <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
            {/* Quotes & Leads isn't built yet, so the trail reads as text. */}
            <span title="Not built yet" className="cursor-help underline">
              Quotes &amp; Leads
            </span>{" "}
            <span aria-hidden="true">/</span>{" "}
            <span title="Not built yet" className="cursor-help underline">
              Raj Malhotra
            </span>{" "}
            <span aria-hidden="true">/</span>{" "}
            <span className="font-semibold text-[#0F172A]">Solar designer</span>
          </nav>
          <span className="text-[12px] text-[#475569]">
            Site visit Mon 10 am · draft before the visit
          </span>
          <span className="rounded-full bg-[#DBEAFE] px-2.5 py-[3px] text-[12px] font-bold text-[#1E40AF]">
            Sample data
          </span>
        </header>
        <MasterDesignerBody role="distributor" start={6} />
      </main>
    </div>
  );
}
