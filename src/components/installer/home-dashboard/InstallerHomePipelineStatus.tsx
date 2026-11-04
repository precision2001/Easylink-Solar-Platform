"use client";

import { InstallerLeadsWorkspace } from "@/components/installer/leads/InstallerLeadsWorkspace";

/**
 * Main column when the "Pipeline status" sub-tab is active: the installer's
 * real leads. The Figma stepper, four checklist columns and equipment strip
 * that used to sit under it were fixed sample content (one example customer,
 * hardcoded checks and dates), not tied to any lead, so they are gone until
 * they can be driven by the selected job.
 */
export function InstallerHomePipelineStatus() {
  return (
    <div className="space-y-5 pb-10">
      <InstallerLeadsWorkspace />
    </div>
  );
}
