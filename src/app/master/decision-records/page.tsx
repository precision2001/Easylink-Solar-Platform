"use client";

import { MasterDecisionRecords } from "@/components/master-dashboard/MasterDecisionRecords";
import { MasterDistSidebar } from "@/components/master-dashboard/MasterDistSidebar";

export default function MasterDecisionRecordsPage() {
  return (
    <div className="flex min-h-screen flex-wrap bg-[#F4F6FA]">
      <div className="w-full basis-[248px] md:flex-[1_1_248px]">
        <MasterDistSidebar active="aiDecisions" />
      </div>
      <main className="min-w-0 flex-[999_1_560px]">
        <MasterDecisionRecords />
      </main>
    </div>
  );
}
