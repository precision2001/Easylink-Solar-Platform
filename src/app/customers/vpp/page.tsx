"use client";

import { CustomerVpp } from "@/components/customer/vpp/CustomerVpp";

/**
 * Matches the Easylink Designer "VPP" mock (CustVPP.dc.html).
 *
 * There is no VPP enrolment, event record or credit ledger in this app, so the
 * earnings and events are the mock's sample data.
 */
export default function CustomerVppPage() {
  return <CustomerVpp />;
}
