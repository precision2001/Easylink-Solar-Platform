"use client";

import Icon from "@/components/ui/Icons";
import { StaffQuotesPanel } from "@/components/quotes/StaffQuotesPanel";
import type { InstallerCustomerSummary } from "@/lib/installers/customers";
import type { InstallerCustomerDesign } from "@/lib/installers/designs";

/**
 * Quote versions for the customer on screen: make a new version from their
 * design, send it, send the deposit link. Uses the customer's lead from the
 * home panel, else the lead their design belongs to (installers can only
 * quote leads assigned to them); falls back to the customer account when
 * there's no lead.
 */
export function InstallerHomeQuotesCard({
  leadId: panelLeadId,
  design,
  customer,
  customerId,
}: {
  /** The lead the home panel loaded for this customer. */
  leadId: string | null;
  design: InstallerCustomerDesign | null;
  customer: InstallerCustomerSummary | null;
  customerId: string;
}) {
  const leadId = panelLeadId ?? design?.lead?.id ?? null;
  // The shell shows a placeholder customer before any exist; don't quote that.
  const realCustomerId = customer?.id ?? (customerId.startsWith("fallback-") ? null : customerId);
  const name = [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") || "this customer";

  return (
    <section aria-labelledby="installer-quotes-title" className="mt-5 overflow-hidden rounded-[11px] border border-warm-border bg-cream-50">
      <header className="flex min-h-[43px] items-center justify-between gap-3 border-b border-l-[2.3px] border-warm-border border-l-[#F68A0A] bg-linear-to-b from-[rgba(246,138,10,0.12)] to-transparent py-2 pl-[17px] pr-[17px]">
        <div className="flex min-w-0 items-center gap-[10px]">
          <Icon name="FileText" className="size-[17px] shrink-0 text-warm-ink" />
          <h3 id="installer-quotes-title" className="m-0 truncate font-inter text-[13.25px] font-bold uppercase leading-[19.875px] tracking-[0.33px] text-warm-ink">
            Quotes
          </h3>
        </div>
        <span className="hidden truncate font-dm-sans text-[11px] text-warm-gray sm:inline">Prices inc GST · STCs applied</span>
      </header>
      <div className="bg-white/60 p-[17px]">
        {leadId || realCustomerId ? (
          <StaffQuotesPanel
            key={leadId ?? realCustomerId ?? ""}
            portal="installer"
            leadId={leadId}
            customerId={leadId ? null : realCustomerId}
            customerName={name}
            customerPhone={customer?.phone ?? null}
            layout="split"
          />
        ) : (
          <p className="m-0 font-dm-sans text-sm text-warm-gray">Choose a customer to see and create their quotes.</p>
        )}
      </div>
    </section>
  );
}
