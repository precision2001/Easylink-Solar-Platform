"use client";

import { useMemo } from "react";
import { InstallerHeader } from "@/components/installer/dashboard/InstallerHeader";
import { ProjectBrowser } from "@/components/ai/ProjectWorkspace";
import { useAppSelector } from "@/lib/store/hooks";

/** Customer files: everything about each customer assigned to this installer, including work before they were assigned. */
export default function InstallerProjectsPage() {
  const user = useAppSelector((s) => s.installerAuth.user);
  const initials = useMemo(() => {
    const f = user?.firstName?.trim().charAt(0) ?? "";
    const l = user?.lastName?.trim().charAt(0) ?? "";
    return (f + l || "IN").toUpperCase().slice(0, 2);
  }, [user?.firstName, user?.lastName]);
  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <InstallerHeader activeNav="projects" userInitials={initials} />
      <ProjectBrowser portal="installer" title="Customer files" />
    </div>
  );
}
