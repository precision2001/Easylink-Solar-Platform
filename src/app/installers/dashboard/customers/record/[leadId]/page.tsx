"use client";

import Link from "next/link";
import { use } from "react";
import { CustomerRecordView } from "@/components/contact-centre/CustomerRecord";

/**
 * Installer Portal: one customer's full record (the same record EasyLink staff
 * use, without EasyLink's costs and profit). Opened from Customers, Pipeline
 * status, Leads, Schedule and Jobs. The backend only returns it for the
 * installer on that lead. The sidebar comes from the installer dashboard layout.
 */
export default function InstallerCustomerRecordPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = use(params);
  return (
    <div className="min-h-screen bg-[#F4F6FA]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-4 py-3.5 sm:px-8">
        <nav
          aria-label="Breadcrumb"
          className="flex-grow text-[13px] text-[#5B6B80]"
        >
          <Link
            href="/installers/dashboard/customers"
            className="text-[#5B6B80] no-underline hover:underline"
          >
            Customers
          </Link>{" "}
          <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Customer record</span>
        </nav>
      </header>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-6 pb-14 sm:px-8">
        <CustomerRecordView portal="installers" leadId={leadId} />
      </div>
    </div>
  );
}
