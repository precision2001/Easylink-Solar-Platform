"use client";

import { CustomerDashboardHeader } from "@/components/customer/dashboard/CustomerDashboardHeader";
import { PortalRealtimeMessagesPanel } from "@/components/messages/PortalRealtimeMessagesPanel";
import { fetchWithCustomerSession } from "@/lib/customers/customer-fetch-client";
import { useAppSelector } from "@/lib/store/hooks";

export default function CustomerMessagesPage() {
  const user = useAppSelector((s) => s.customerAuth.user);

  return (
    <div className="customer-page-bg flex min-h-screen flex-col">
      <CustomerDashboardHeader
        firstName={user?.firstName}
        lastName={user?.lastName}
        activeNav="messages"
      />

      <main className="mx-auto flex w-full max-w-[1440px] min-h-0 flex-1 flex-col gap-4 px-4 py-5 md:gap-5 md:px-5">
        <PortalRealtimeMessagesPanel
          portal="customer"
          sessionFetch={fetchWithCustomerSession}
          user={user}
        />
      </main>
    </div>
  );
}
