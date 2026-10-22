"use client";

import { MasterDistOrders } from "@/components/master-dashboard/MasterDistOrders";
import { MasterDistSidebar } from "@/components/master-dashboard/MasterDistSidebar";

export default function MasterOrdersPage() {
  return (
    <div className="flex min-h-screen flex-wrap bg-[#F4F6FA] text-[#0F172A]">
      <div className="w-full basis-[248px] md:flex-[1_1_248px]">
        <MasterDistSidebar active="dOrders" />
      </div>
      <main className="min-w-0 flex-[999_1_560px]">
        <MasterDistOrders />
      </main>
    </div>
  );
}
