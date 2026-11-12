"use client";

import { CustomerPortalShell, PortalPageHeader } from "@/components/customer/portal/CustomerPortalShell";
import { PrivacyConsentView } from "@/components/customer/portal/ExtraScreens";
import { useAppSelector } from "@/lib/store/hooks";

export default function CustomerPrivacyPage() {
  const user = useAppSelector((s) => s.customerAuth.user);
  return (
    <CustomerPortalShell active="privacy">
      <PortalPageHeader eyebrow="After install" title="My data and consent" intro="What EasyLink holds about you, who can see it, and how to change that." />
      <PrivacyConsentView email={user?.email ?? null} />
    </CustomerPortalShell>
  );
}
