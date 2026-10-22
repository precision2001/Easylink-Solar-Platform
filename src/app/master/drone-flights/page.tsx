"use client";

import { MasterDistSidebar } from "@/components/master-dashboard/MasterDistSidebar";
import { MasterDroneOps } from "@/components/master-dashboard/MasterDroneOps";

export default function MasterDroneFlightsPage() {
  return (
    <div className="flex min-h-screen flex-wrap bg-[#F4F6FA]">
      <div className="w-full basis-[248px] md:flex-[1_1_248px]">
        <MasterDistSidebar active="drone" />
      </div>
      <main className="min-w-0 flex-[999_1_560px]">
        <MasterDroneOps />
      </main>
    </div>
  );
}
