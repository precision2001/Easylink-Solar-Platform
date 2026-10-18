"use client";

import { MasterDistSidebar } from "@/components/master-dashboard/MasterDistSidebar";
import { MasterJobsSchedule } from "@/components/master-dashboard/MasterJobsSchedule";

export default function MasterJobsPage() {
  return (
    <div className="flex min-h-screen flex-wrap bg-[#F4F6FA]">
      <div className="w-full basis-[248px] md:flex-[1_1_248px]">
        <MasterDistSidebar active="jobs" />
      </div>
      <main className="min-w-0 flex-[999_1_560px]">
        <MasterJobsSchedule />
      </main>
    </div>
  );
}
