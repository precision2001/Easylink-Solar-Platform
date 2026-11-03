"use client";

import { MasterContactCentre } from "@/components/master-dashboard/MasterContactCentre";

/**
 * Matches the Easylink Designer "Installer · Contact Centre" mock
 * (InstContact.dc.html), which imports the same Contact Centre body the
 * Operations artboard does. It is reused here at role "installer" rather than
 * duplicated.
 *
 * The sidebar comes from the installer dashboard layout.
 */
export default function InstallerContactCentrePage() {
  return (
    <div className="min-h-screen bg-[#F4F6FA] text-[#0F172A]">
      <MasterContactCentre role="installer" />
    </div>
  );
}
