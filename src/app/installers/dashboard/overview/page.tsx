"use client";

import { useMemo } from "react";
import { InstallerHeader } from "@/components/installer/dashboard/InstallerHeader";
import { InstallerOverviewDashboard } from "@/components/installer/home-dashboard/InstallerOverviewDashboard";
import { useAppSelector } from "@/lib/store/hooks";

export default function InstallerOverviewPage() {
  const user = useAppSelector((s) => s.installerAuth.user);

  const initials = useMemo(() => {
    const f = user?.firstName?.trim().charAt(0) ?? "";
    const l = user?.lastName?.trim().charAt(0) ?? "";
    return (f + l || "IN").toUpperCase().slice(0, 2);
  }, [user?.firstName, user?.lastName]);

  return (
    <div className="min-h-screen bg-surface-50">
      <InstallerHeader activeNav="overview" userInitials={initials} />
      <InstallerOverviewDashboard />
    </div>
  );
}
