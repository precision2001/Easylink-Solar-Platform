"use client";

import { Suspense } from "react";

import { MasterDistSidebar } from "@/components/master-dashboard/MasterDistSidebar";
import { MasterAgentDialer } from "@/components/master-dashboard/MasterAgentDialer";

export default function MasterAgentDialerPage() {
  return (
    <div className="flex min-h-screen flex-wrap bg-[#F4F6FA]">
      <div className="w-full basis-[248px] md:flex-[1_1_248px]">
        <MasterDistSidebar active="dialer" />
      </div>
      <main className="min-w-0 flex-[999_1_560px]">
        {/*
         * The dialler reads `?number=` with useSearchParams(), which opts the
         * tree into client-side rendering — it needs a Suspense boundary or the
         * production build cannot prerender this page.
         */}
        <Suspense fallback={null}>
          <MasterAgentDialer />
        </Suspense>
      </main>
    </div>
  );
}
