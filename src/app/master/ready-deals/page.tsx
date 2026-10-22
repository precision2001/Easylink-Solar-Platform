"use client";

import { MasterDistSidebar } from "@/components/master-dashboard/MasterDistSidebar";
import { MasterReadyDeals } from "@/components/market/MasterMarket";

export default function MasterReadyDealsPage() {
  return (
    <div className="flex min-h-screen flex-wrap bg-[#F4F6FA]">
      <div className="w-full basis-[248px] md:flex-[1_1_248px]">
        <MasterDistSidebar active="readyDeals" />
      </div>
      <main className="min-w-0 flex-[999_1_560px] p-4 md:p-6">
        <MasterReadyDeals />
      </main>
    </div>
  );
}
