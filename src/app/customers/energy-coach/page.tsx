"use client";

import { CustomerPortalShell, PortalPageHeader } from "@/components/customer/portal/CustomerPortalShell";
import { ComingSoonView } from "@/components/customer/portal/ExtraScreens";

export default function CustomerEnergyCoachPage() {
  return (
    <CustomerPortalShell active="coach">
      <PortalPageHeader eyebrow="After install" title="Energy coach" />
      <ComingSoonView
        icon="leaf"
        title="Daily advice from your own system"
        body="Once your system is connected, EasyLink AI will watch how your home makes and uses power, and tell you how to get more from it."
        points={["Live view of solar, battery, home and grid", "When to run the dishwasher, pool pump or EV charger", "Virtual power plant events and what you earned", "A yearly check that you're on the best plan"]}
        now={{ label: "Ask EasyLink AI instead", href: "/customers/voice" }}
      />
    </CustomerPortalShell>
  );
}
