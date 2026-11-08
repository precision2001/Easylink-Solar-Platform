"use client";

import { CustomerPortalShell, PortalPageHeader } from "@/components/customer/portal/CustomerPortalShell";
import { MyInstallerView } from "@/components/customer/portal/ExtraScreens";

export default function CustomerInstallerPage() {
  return (
    <CustomerPortalShell active="installer">
      <PortalPageHeader eyebrow="Go ahead" title="My installer" intro="Who's installing your system, when, and how to reach them." />
      <MyInstallerView />
    </CustomerPortalShell>
  );
}
