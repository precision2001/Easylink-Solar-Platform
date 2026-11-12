"use client";

import { CustomerEnergy } from "@/components/customer/energy/CustomerEnergy";

/**
 * Matches the Easylink Designer "Energy" mock (CustEnergy.dc.html).
 *
 * No inverter is connected to this app, so every figure is the mock's sample
 * data — see CustomerEnergy for why that is stated rather than styled as live.
 */
export default function CustomerEnergyPage() {
  return <CustomerEnergy />;
}
