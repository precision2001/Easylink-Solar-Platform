"use client";

import { CustomerPortalShell, PortalPageHeader } from "@/components/customer/portal/CustomerPortalShell";
import { AdditionalWorksView } from "@/components/customer/portal/ExtraScreens";

export default function CustomerWorksPage() {
  return (
    <CustomerPortalShell active="works">
      <PortalPageHeader
        eyebrow="Build and price"
        title="Additional works"
        intro="Anything beyond the panels and battery, such as a switchboard or phase upgrade. You always see the price before you approve it."
      />
      <AdditionalWorksView />
    </CustomerPortalShell>
  );
}
