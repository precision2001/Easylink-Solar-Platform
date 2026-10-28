"use client";

import { useMemo } from "react";
import { InstallerHeader } from "@/components/installer/dashboard/InstallerHeader";
import { InstallerReadyDeals } from "@/components/market/InstallerReadyDeals";
import { useAppSelector } from "@/lib/store/hooks";

export default function Page() {
  const user = useAppSelector((s) => s.installerAuth.user);
  const initials = useMemo(() => ((user?.firstName?.charAt(0) ?? "") + (user?.lastName?.charAt(0) ?? "") || "IN").toUpperCase(), [user?.firstName, user?.lastName]);
  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <InstallerHeader activeNav="readyDeals" userInitials={initials} />
      <main className="mx-auto w-full max-w-[1200px] p-4 md:p-6">
        <InstallerReadyDeals />
      </main>
    </div>
  );
}
