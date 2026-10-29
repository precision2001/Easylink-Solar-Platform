"use client";

import Link from "next/link";
import { useInstallerHomePanel } from "@/hooks/useInstallerHomePanel";
import { productsByCategory, systemSizeKwFrom } from "@/lib/designs/product-specs";

/**
 * Context for whoever the installer is messaging, matching the sidebar in the
 * Easylink Designer "Messages" artboard (InstMessages.dc.html).
 *
 * For the installer role the chat's active peer id *is* the customer id (see
 * `useRealtimeChat`, which matches conversations on `customerId`), so this
 * loads that customer's real design rather than restating the mock's figures.
 * The artboard also shows "Stage" and "Next" rows; the lead carries a status
 * but nothing in the API schedules a next step, so only the backed rows are
 * rendered.
 */
export function InstallerMessageCustomerPanel({
  customerId,
  customerName,
}: {
  customerId: string | null;
  customerName: string;
}) {
  const panel = useInstallerHomePanel(customerId);
  const design = panel.design;

  const panelItem = productsByCategory(design?.products, "panel")[0];
  const systemKw = systemSizeKwFrom(panelItem, design?.panelCount);

  // Soonest appointment by start time. Deliberately not filtered to "future
  // only": comparing against the clock during render is impure, and the
  // nearest booking is the useful thing to show either way.
  const nextAppointment = [...panel.appointments].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  )[0];

  const rows: { label: string; value: string }[] = [];
  if (panel.lead?.status) rows.push({ label: "Stage", value: panel.lead.status });
  if (systemKw) rows.push({ label: "System", value: `${systemKw.toFixed(2)} kW` });
  if (nextAppointment) {
    rows.push({
      label: "Booking",
      value: `${nextAppointment.title} · ${new Date(
        nextAppointment.startAt,
      ).toLocaleString("en-AU", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })}`,
    });
  }

  return (
    <aside
      aria-label="Customer"
      className="flex w-full flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-4 lg:w-65 lg:shrink-0"
    >
      <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#475569]">
        Customer
      </span>
      <strong className="text-[15px] text-[#0F172A]">{customerName}</strong>

      {!customerId ? null : panel.loading ? (
        <span className="text-[12px] text-[#5B6B80]">Loading details...</span>
      ) : (
        <>
          {rows.length ? (
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1.5 text-[12px]">
              {rows.map((row) => (
                <div key={row.label} className="contents">
                  <dt className="text-[#5B6B80]">{row.label}</dt>
                  <dd className="m-0 font-semibold text-[#0F172A]">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <span className="text-[12px] text-[#5B6B80]">
              No design or lead details for this customer yet.
            </span>
          )}

          <Link
            href="/installers/dashboard/customers"
            className="text-[13px] font-semibold text-[#1565C0]"
          >
            Open customer workspace
          </Link>
        </>
      )}
    </aside>
  );
}
