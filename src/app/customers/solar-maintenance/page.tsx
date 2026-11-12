"use client";

import { CustomerMaintenancePlan } from "@/components/customer/maintenance/CustomerMaintenancePlan";

/**
 * Matches the Easylink Designer "Maintenance plan" mock
 * (CustMaintenance.dc.html).
 *
 * The working maintenance quote request — the one that really reaches the
 * EasyLink team as a lead — still lives at /customers/solar-maintenance/request
 * and is linked from this page.
 */
export default function CustomerSolarMaintenancePage() {
  return <CustomerMaintenancePlan />;
}
