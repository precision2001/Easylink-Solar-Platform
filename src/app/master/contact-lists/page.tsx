"use client";

import { MasterContactLists } from "@/components/master-dashboard/MasterContactLists";
import { MasterDistSidebar } from "@/components/master-dashboard/MasterDistSidebar";

export default function MasterContactListsPage() {
  return (
    <div className="flex min-h-screen flex-wrap bg-[#F4F6FA] text-[#0F172A]">
      <div className="w-full basis-[248px] md:flex-[1_1_248px]">
        <MasterDistSidebar active="lists" />
      </div>
      <main className="min-w-0 flex-[999_1_560px]">
        <MasterContactLists />
      </main>
    </div>
  );
}
