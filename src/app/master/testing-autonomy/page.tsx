"use client";

import { MasterAiQuality } from "@/components/master-dashboard/MasterAiQuality";
import { MasterDistSidebar } from "@/components/master-dashboard/MasterDistSidebar";

export default function MasterTestingAutonomyPage() {
  return (
    <div className="flex min-h-screen flex-wrap bg-[#F4F6FA]">
      <div className="w-full basis-[248px] md:flex-[1_1_248px]">
        <MasterDistSidebar active="aiQuality" />
      </div>
      <main className="min-w-0 flex-[999_1_560px]">
        <MasterAiQuality />
      </main>
    </div>
  );
}
