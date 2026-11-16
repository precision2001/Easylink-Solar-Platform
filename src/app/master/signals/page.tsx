"use client";

import { MasterDistSidebar } from "@/components/master-dashboard/MasterDistSidebar";
import { MasterSignals } from "@/components/master-dashboard/MasterSignals";

export default function MasterSignalsPage() {
  return (
    <div className="flex min-h-screen flex-wrap bg-[#F4F6FA]">
      <div className="w-full basis-[248px] md:flex-[1_1_248px]">
        <MasterDistSidebar active="signals" />
      </div>
      <main className="min-w-0 flex-[999_1_560px]">
        <MasterSignals />
      </main>
    </div>
  );
}
