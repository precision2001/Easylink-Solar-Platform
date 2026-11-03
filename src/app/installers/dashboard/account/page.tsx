"use client";

import { useMemo } from "react";
import { InstallerHeader } from "@/components/installer/dashboard/InstallerHeader";
import { PersonItems } from "@/components/ai/ProjectWorkspace";
import { useAppSelector } from "@/lib/store/hooks";

/** My account: everything that is for or about this installer — payouts, invoices, their own files, bookings and tasks. */
export default function InstallerAccountPage() {
  const user = useAppSelector((s) => s.installerAuth.user);
  const initials = useMemo(() => {
    const f = user?.firstName?.trim().charAt(0) ?? "";
    const l = user?.lastName?.trim().charAt(0) ?? "";
    return (f + l || "IN").toUpperCase().slice(0, 2);
  }, [user?.firstName, user?.lastName]);
  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <InstallerHeader activeNav="account" userInitials={initials} />
      <main className="mx-auto w-full max-w-[1100px] p-4 md:p-6">
        <PersonItems portal="installer" title="My account" intro="Your payouts, invoices, files, bookings and tasks. Customer work is under Customer files." />
      </main>
    </div>
  );
}
