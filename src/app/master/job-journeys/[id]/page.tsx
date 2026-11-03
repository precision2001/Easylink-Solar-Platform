"use client";

import { use } from "react";
import { MasterDistSidebar } from "@/components/master-dashboard/MasterDistSidebar";
import { JobWorkspace } from "@/components/jobs/JobWorkspace";

/** Staff view of one job: every step, the matching ranking, payments and documents. */
export default function MasterJobJourneyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="flex min-h-screen flex-wrap bg-[#F4F6FA]">
      <div className="w-full basis-[248px] md:flex-[1_1_248px]">
        <MasterDistSidebar active="journeys" />
      </div>
      <main className="min-w-0 flex-[999_1_560px] p-4 md:p-6">
        <JobWorkspace portal="admin" jobId={decodeURIComponent(id)} backHref="/master/job-journeys" />
      </main>
    </div>
  );
}
