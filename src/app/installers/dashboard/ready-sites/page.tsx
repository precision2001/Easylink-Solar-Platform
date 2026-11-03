"use client";

import { InstallerReadySites } from "@/components/market/InstallerReadySites";
import { useAppSelector } from "@/lib/store/hooks";

/**
 * Installer marketplace · Ready Sites. The sidebar comes from the installer
 * dashboard layout, so this page does not repeat a header.
 */
export default function InstallerReadySitesPage() {
  const user = useAppSelector((s) => s.installerAuth.user);

  return (
    <div className="min-h-screen bg-[#F4F6FA] px-6 py-6 pb-14">
      <InstallerReadySites meId={user?.id ? String(user.id) : undefined} />
    </div>
  );
}
