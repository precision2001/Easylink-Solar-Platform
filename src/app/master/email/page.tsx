"use client";

import { MasterDistSidebar } from "@/components/master-dashboard/MasterDistSidebar";
import { EmailWorkspace } from "@/components/email/EmailWorkspace";

export default function MasterEmailPage() {
  return (
    <div className="flex min-h-screen flex-wrap bg-[#F4F6FA] text-[#0F172A]">
      {/* The menu scrolls by itself here so the inbox can fill one screen. */}
      <div className="w-full basis-[248px] md:flex-[1_1_248px] lg:sticky lg:top-0 lg:h-dvh lg:self-start lg:overflow-y-auto">
        <MasterDistSidebar active="email" />
      </div>
      <main className="min-w-0 flex-[999_1_560px]">
        <EmailWorkspace portal="admin" />
      </main>
    </div>
  );
}
