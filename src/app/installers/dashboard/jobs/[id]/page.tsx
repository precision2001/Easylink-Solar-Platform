"use client";

import { use, useMemo } from "react";
import { InstallerHeader } from "@/components/installer/dashboard/InstallerHeader";
import { JobWorkspace } from "@/components/jobs/JobWorkspace";
import { useAppSelector } from "@/lib/store/hooks";

/** One job for the installer: offer, confirmation, invoices, connection, order, on-site app, STCs, monitoring. */
export default function InstallerJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const user = useAppSelector((s) => s.installerAuth.user);
  const initials = useMemo(() => ((user?.firstName?.charAt(0) ?? "") + (user?.lastName?.charAt(0) ?? "") || "IN").toUpperCase(), [user?.firstName, user?.lastName]);
  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <InstallerHeader activeNav="jobs" userInitials={initials} />
      <main className="mx-auto w-full max-w-[1200px] p-3 md:p-6">
        <JobWorkspace portal="installer" jobId={decodeURIComponent(id)} backHref="/installers/dashboard/jobs" />
      </main>
    </div>
  );
}
