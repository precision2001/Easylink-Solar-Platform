"use client";

import { MasterDistSidebar } from "@/components/master-dashboard/MasterDistSidebar";
import { MasterAiBookings } from "@/components/master-dashboard/MasterAiBookings";

export default function MasterAiBookingsPage() {
  return (
    <div className="flex min-h-screen flex-wrap bg-[#F4F6FA]">
      <div className="w-full basis-[248px] md:flex-[1_1_248px]">
        <MasterDistSidebar active="aiBookings" />
      </div>
      <main className="min-w-0 flex-[999_1_560px]">
        <MasterAiBookings />
      </main>
    </div>
  );
}
