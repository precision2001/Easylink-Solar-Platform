"use client";

import { MasterDashboardHeader } from "@/components/master-dashboard/MasterDashboardHeader";
import { MasterDialler } from "@/components/master-calls/MasterDialler";

export default function MasterCallsPage() {
  return (
    <div className="min-h-screen master-page-bg">
      <MasterDashboardHeader activeNavId="calls" />
      <div className="mx-auto w-full max-w-[1440px] px-5 py-6">
        <div className="mb-5">
          <h1 className="font-inter text-[20px] font-bold leading-[30px] text-warm-ink">
            Calls
          </h1>
          <p className="font-inter text-[13px] leading-[20px] text-warm-ink/60">
            Call Australian mobiles, landlines and 13/1300/1800 numbers from the
            distributor line.
          </p>
        </div>
        <div className="max-w-[420px]">
          <MasterDialler />
        </div>
      </div>
    </div>
  );
}
