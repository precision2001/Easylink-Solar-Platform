"use client";

import { DashboardNotificationsProvider } from "@/components/dashboard/DashboardNotificationsProvider";
import { InstallerCustomersProvider } from "@/components/installer/dashboard/InstallerCustomersProvider";
import { InstNav } from "@/components/installer/dashboard/InstNav";

export default function InstallerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardNotificationsProvider mode="installer">
      <InstallerCustomersProvider>
        <div className="flex min-h-screen text-warm-ink">
          <aside className="sticky top-0 hidden h-screen w-62 shrink-0 overflow-y-auto lg:block">
            <InstNav />
          </aside>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </InstallerCustomersProvider>
    </DashboardNotificationsProvider>
  );
}
