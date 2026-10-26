"use client";

import { useMemo } from "react";
import { InstallerHeader } from "@/components/installer/dashboard/InstallerHeader";
import { JobsList } from "@/components/jobs/JobWorkspace";
import { useAppSelector } from "@/lib/store/hooks";

/** Jobs: offers to answer and every job assigned to this installer, by stage. */
export default function InstallerJobsPage() {
  const user = useAppSelector((s) => s.installerAuth.user);
  const initials = useMemo(() => ((user?.firstName?.charAt(0) ?? "") + (user?.lastName?.charAt(0) ?? "") || "IN").toUpperCase(), [user?.firstName, user?.lastName]);
  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <InstallerHeader activeNav="jobs" userInitials={initials} />
      <main className="mx-auto w-full max-w-[1200px] p-4 md:p-6">
        <JobsList portal="installer" hrefFor={(id) => `/installers/dashboard/jobs/${encodeURIComponent(id)}`} title="Jobs" intro="Offers to answer, then every job from acceptance to the STC claim." />
      </main>
    </div>
  );
}
