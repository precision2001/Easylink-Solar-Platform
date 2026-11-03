"use client";

import { MasterContactLists } from "@/components/master-dashboard/MasterContactLists";

/**
 * Matches the Easylink Designer "Installer · Contact lists" mock
 * (InstContactLists.dc.html), which imports the same Contact lists body the
 * Operations artboard does. It is reused here at role "installer" rather than
 * duplicated.
 *
 * The sidebar comes from the installer dashboard layout.
 */
export default function InstallerContactListsPage() {
  return (
    <div className="min-h-screen bg-[#F4F6FA] text-[#0F172A]">
      <MasterContactLists role="installer" />
    </div>
  );
}
