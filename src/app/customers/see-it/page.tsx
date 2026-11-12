"use client";

import { CustomerPortalShell, PortalPageHeader } from "@/components/customer/portal/CustomerPortalShell";
import { ComingSoonView } from "@/components/customer/portal/ExtraScreens";

export default function CustomerSeeItPage() {
  return (
    <CustomerPortalShell active="ar">
      <PortalPageHeader eyebrow="My home" title="See it on my home" />
      <ComingSoonView
        icon="sun"
        title="Your system, on your house, through your phone"
        body="Point your phone at your house and see your panels, battery and EV charger where they'll go, before you decide."
        points={["Panels on your roof, from your own design", "Battery and charger on your wall", "Share a short clip with the family"]}
        now={{ label: "See my design", href: "/customers/design" }}
      />
    </CustomerPortalShell>
  );
}
