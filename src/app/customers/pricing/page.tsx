"use client";

import { CustomerPortalShell, PortalPageHeader } from "@/components/customer/portal/CustomerPortalShell";
import { PriceRebatesView } from "@/components/customer/portal/ExtraScreens";

export default function CustomerPricingPage() {
  return (
    <CustomerPortalShell active="pricing">
      <PortalPageHeader
        eyebrow="Build and price"
        title="Every dollar, every rebate"
        intro="Your quote line by line: equipment, works, the rebates already taken off, your deposit and the ways you can pay."
      />
      <PriceRebatesView />
    </CustomerPortalShell>
  );
}
