"use client";

import { InstallerReadyDeals } from "@/components/market/InstallerReadyDeals";

/**
 * Installer marketplace · Ready Deals. The sidebar comes from the installer
 * dashboard layout, so this page does not repeat a header.
 */
export default function InstallerReadyDealsPage() {
  return (
    <div className="min-h-screen bg-[#F4F6FA] px-6 py-6 pb-14">
      <InstallerReadyDeals />
    </div>
  );
}
