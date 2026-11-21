"use client";

import { MasterBookingLink } from "@/components/master-dashboard/MasterBookingLink";
import { MasterDistSidebar } from "@/components/master-dashboard/MasterDistSidebar";

export default function MasterBookingLinkPage() {
  return (
    <div className="flex min-h-screen flex-wrap bg-[#F4F6FA]">
      <div className="w-full basis-[248px] md:flex-[1_1_248px]">
        <MasterDistSidebar active="bookingLink" />
      </div>
      <main className="min-w-0 flex-[999_1_560px]">
        <MasterBookingLink />
      </main>
    </div>
  );
}
