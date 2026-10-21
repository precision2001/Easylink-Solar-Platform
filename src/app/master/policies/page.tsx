"use client";

import { MasterDistSidebar } from "@/components/master-dashboard/MasterDistSidebar";
import { MasterPolicies } from "@/components/master-dashboard/MasterPolicies";

export default function MasterPoliciesPage() {
  return (
    <div className="flex min-h-screen flex-wrap bg-[#F4F6FA]">
      <div className="w-full basis-[248px] md:flex-[1_1_248px]">
        <MasterDistSidebar active="aiPolicies" />
      </div>
      <main className="min-w-0 flex-[999_1_560px]">
        <MasterPolicies />
      </main>
    </div>
  );
}
