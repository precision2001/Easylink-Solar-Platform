"use client";

import { CustomerPortalShell, PortalPageHeader } from "@/components/customer/portal/CustomerPortalShell";
import { VoiceConciergeView } from "@/components/customer/portal/ExtraScreens";

export default function CustomerVoicePage() {
  return (
    <CustomerPortalShell active="voice">
      <PortalPageHeader eyebrow="Go ahead" title="Talk to EasyLink AI" intro="Chat or call, day or night. A real person is always one step away." />
      <VoiceConciergeView />
    </CustomerPortalShell>
  );
}
