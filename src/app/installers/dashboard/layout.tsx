"use client";

import { DashboardNotificationsProvider } from "@/components/dashboard/DashboardNotificationsProvider";
import { InstallerChrome } from "@/components/installer/dashboard/InstallerChrome";
import { InstallerCustomersProvider } from "@/components/installer/dashboard/InstallerCustomersProvider";

export default function InstallerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardNotificationsProvider mode="installer">
      <InstallerCustomersProvider>
        {/* Sidebar on large screens, top bar + drawer on phones and tablets. */}
        <InstallerChrome>{children}</InstallerChrome>
      </InstallerCustomersProvider>
    </DashboardNotificationsProvider>
  );
}
