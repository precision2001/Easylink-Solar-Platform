"use client";

import Link from "next/link";
import { use } from "react";
import { MasterDistSidebar } from "@/components/master-dashboard/MasterDistSidebar";
import { CustomerRecordView } from "@/components/contact-centre/CustomerRecord";

export default function MasterCustomerRecordPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = use(params);
  return (
    <div className="flex min-h-screen flex-wrap bg-[#F4F6FA]">
      <div className="w-full basis-[248px] md:flex-[1_1_248px]">
        <MasterDistSidebar active="calls" />
      </div>
      <main className="min-w-0 flex-[999_1_560px]">
        <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
          <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
            <Link href="/master/calls" className="text-[#5B6B80] no-underline hover:underline">
              Calls
            </Link>{" "}
            <span aria-hidden="true">/</span> <span className="font-semibold text-[#0F172A]">Customer record</span>
          </nav>
        </header>
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-8 py-6 pb-14">
          <CustomerRecordView portal="admin" leadId={leadId} />
        </div>
      </main>
    </div>
  );
}
