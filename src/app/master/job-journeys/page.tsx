"use client";

import { MasterDistSidebar } from "@/components/master-dashboard/MasterDistSidebar";
import { JobsList } from "@/components/jobs/JobWorkspace";

/** Staff: every job journey, its stage and installer; open one to see everything and act on any step. */
export default function MasterJobJourneysPage() {
  return (
    <div className="flex min-h-screen flex-wrap bg-[#F4F6FA]">
      <div className="w-full basis-[248px] md:flex-[1_1_248px]">
        <MasterDistSidebar active="journeys" />
      </div>
      <main className="min-w-0 flex-[999_1_560px] p-4 md:p-6">
        <JobsList portal="admin" hrefFor={(id) => `/master/job-journeys/${encodeURIComponent(id)}`} title="Job journeys" intro="From the customer's chosen design to the STC claim and three days of monitoring." />
      </main>
    </div>
  );
}
