"use client";

import { MasterDistSidebar } from "@/components/master-dashboard/MasterDistSidebar";
import { MasterDispatch } from "@/components/master-dashboard/MasterDispatch";

export default function MasterDispatchPage() {
  return (
    <div className="flex min-h-screen flex-wrap bg-[#F4F6FA]">
      <div className="w-full basis-[248px] md:flex-[1_1_248px]">
        <MasterDistSidebar active="dispatch" />
      </div>
      <main className="min-w-0 flex-[999_1_560px]">
        <MasterDispatch />
      </main>
    </div>
  );
}
