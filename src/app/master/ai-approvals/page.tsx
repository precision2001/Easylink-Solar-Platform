"use client";

import { MasterAiApprovals } from "@/components/master-dashboard/MasterAiApprovals";
import { MasterDistSidebar } from "@/components/master-dashboard/MasterDistSidebar";

export default function MasterAiApprovalsPage() {
  return (
    <div className="flex min-h-screen flex-wrap bg-[#F4F6FA]">
      <div className="w-full basis-[248px] md:flex-[1_1_248px]">
        <MasterDistSidebar active="aiApprovals" />
      </div>
      <main className="min-w-0 flex-[999_1_560px]">
        <MasterAiApprovals />
      </main>
    </div>
  );
}
