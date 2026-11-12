"use client";

import { CustomerHome } from "@/components/customer/home/CustomerHome";

/**
 * Matches the Easylink Designer "Customer home" mock (CustHome.dc.html).
 *
 * Where a customer lands after signing in. The live, data-backed dashboard
 * this replaced still exists at /customers/overview, and this page links to
 * it — see CustomerHome for which parts of the design have no data source.
 */
export default function CustomerDashboardPage() {
  return <CustomerHome />;
}
