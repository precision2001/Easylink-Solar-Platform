"use client";

import { CustomerDashboardHeader } from "@/components/customer/dashboard/CustomerDashboardHeader";
import { SolarMaintenanceWizard } from "@/components/customer/solar-maintenance/SolarMaintenanceWizard";
import { useAppSelector } from "@/lib/store/hooks";

export function SolarMaintenancePageView() {
  const user = useAppSelector((s) => s.customerAuth.user);

  return (
    <div className="customer-page-bg flex min-h-screen flex-col">
      <CustomerDashboardHeader
        firstName={user?.firstName}
        lastName={user?.lastName}
        activeNav="maintenance"
      />

      <main className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden">
        <div className="solar-maint-hero-root solar-maint-hero-root--below-header font-inter">
          <div className="solar-maint-hero-photo" aria-hidden />
          <div className="solar-maint-hero-vignette" aria-hidden />
          <div className="relative z-10 flex flex-1 flex-col px-4 pb-12 pt-4 sm:px-8">
            <div className="flex flex-1 justify-center sm:mt-8">
              <SolarMaintenanceWizard />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
