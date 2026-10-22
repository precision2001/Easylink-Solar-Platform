"use client";

import { MasterDistSidebar } from "@/components/master-dashboard/MasterDistSidebar";
import { MasterPriceBook } from "@/components/master-dashboard/MasterPriceBook";

export default function MasterPriceBookPage() {
  return (
    <div className="flex min-h-screen flex-wrap bg-[#F4F6FA] text-[#0F172A]">
      <div className="w-full basis-[248px] md:flex-[1_1_248px]">
        <MasterDistSidebar active="pbook" />
      </div>
      <main className="min-w-0 flex-[999_1_560px]">
        <MasterPriceBook />
      </main>
    </div>
  );
}
