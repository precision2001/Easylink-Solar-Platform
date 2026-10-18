"use client";

import { MasterDistSidebar } from "@/components/master-dashboard/MasterDistSidebar";
import { MasterQuotesLeads } from "@/components/master-dashboard/MasterQuotesLeads";

export default function MasterQuotesLeadsPage() {
  return (
    <div className="flex min-h-screen flex-wrap bg-[#F4F6FA]">
      <div className="w-full basis-[248px] md:flex-[1_1_248px]">
        <MasterDistSidebar active="quotes" />
      </div>
      <main className="min-w-0 flex-[999_1_560px]">
        <MasterQuotesLeads />
      </main>
    </div>
  );
}
