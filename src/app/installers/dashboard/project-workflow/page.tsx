"use client";

import { Suspense } from "react";
import { InstallerProjectWorkflow } from "@/components/installer/workflow/InstallerProjectWorkflow";

export default function InstallerProjectWorkflowPage() {
  return (
    <div className="min-h-screen bg-[#F4F6FA] px-6 py-6 pb-14">
      <Suspense fallback={null}>
        <InstallerProjectWorkflow />
      </Suspense>
    </div>
  );
}
