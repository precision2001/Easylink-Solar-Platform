"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CustomerRecordView } from "@/components/contact-centre/CustomerRecord";
import { useInstallerCustomers } from "@/components/installer/dashboard/InstallerCustomersProvider";
import { useInstallerHomePanel } from "@/hooks/useInstallerHomePanel";
import {
  cecApprovedLabel,
  panelInverterRatio,
  productLabel,
  productsByCategory,
} from "@/lib/designs/product-specs";
import type { InstallerCustomerSummary } from "@/lib/installers/customers";

/**
 * Customer workspace, matching the Easylink Designer "Customers" artboard
 * (Customers.dc.html): a customer list beside the selected customer's design,
 * equipment, appointments, notes and tasks/tags.
 *
 * Unlike the sales and AI-assistant pages, this one runs on the real
 * installer APIs — the customer list, the design and its attached products,
 * and the per-customer panels all come from the live endpoints via
 * `useInstallerCustomers` and `useInstallerHomePanel`. Sections the API has
 * no data for say so rather than showing invented figures.
 */

const PANEL = "rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]";

function initialsOf(customer: InstallerCustomerSummary) {
  const first = (customer.firstName ?? "").trim().charAt(0);
  const last = (customer.lastName ?? "").trim().charAt(0);
  const pair = `${first}${last}`.toUpperCase();
  return pair.trim() || "NA";
}

function nameOf(customer: InstallerCustomerSummary) {
  const full = `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim();
  return full || customer.email?.trim() || "Unnamed customer";
}

/** Addresses are one free-text line; the suburb is whatever follows the last comma. */
function suburbOf(address?: string | null) {
  const parts = (address ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : null;
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-[13px]">
      <span className="shrink-0 text-[#5B6B80]">{label}</span>
      <span className="min-w-0 text-right font-semibold text-[#0F172A]">
        {value}
      </span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-[13px] text-[#5B6B80]">{children}</p>;
}

export function InstallerCustomerWorkspace() {
  const { customers, loading, refetch } = useInstallerCustomers();
  const [search, setSearch] = useState("");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"record" | "design">("record");

  // Derived rather than synced in an effect: a pick only holds while that
  // customer is still in the list, so a refetch that drops them falls back to
  // the first row instead of leaving the page pointing at nothing.
  const selectedId =
    pickedId && customers.some((c) => c.id === pickedId)
      ? pickedId
      : (customers[0]?.id ?? null);

  const panel = useInstallerHomePanel(selectedId);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const haystack = `${nameOf(c)} ${c.email ?? ""} ${c.address ?? ""}`;
      return haystack.toLowerCase().includes(q);
    });
  }, [customers, search]);

  const selected =
    panel.customer ?? customers.find((c) => c.id === selectedId) ?? null;
  const design = panel.design;

  const panelItem = productsByCategory(design?.products, "panel")[0];
  const inverterItem = productsByCategory(design?.products, "inverter")[0];
  const hasBattery = productsByCategory(design?.products, "batter").length > 0;
  const ratio = panelInverterRatio(
    panelItem,
    inverterItem,
    design?.panelCount,
    hasBattery,
  );

  const equipment = useMemo(
    () =>
      (
        [
          ["Solar panels", "panel"],
          ["Inverter", "inverter"],
          ["Battery", "batter"],
          ["EV charger", "charger"],
          ["Heat pump", "heat"],
        ] as const
      )
        .map(([kind, category]) => {
          const item = productsByCategory(design?.products, category)[0];
          return item ? { kind, item } : null;
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
    [design?.products],
  );

  return (
    <div className="flex min-h-screen flex-wrap items-start bg-[#F4F6FA]">
      <aside
        aria-label="Customer list"
        className="flex w-full flex-[1_1_260px] flex-col gap-2.5 self-stretch border-r border-[#E3E8EF] bg-white p-4"
      >
        <div className="flex items-center gap-2">
          <h2 className="m-0 flex-grow text-[16px] font-bold text-[#0F172A]">
            Customers
          </h2>
          <button
            type="button"
            onClick={() => refetch()}
            className="h-9 rounded-[9px] border border-[#CBD5E1] bg-white px-2.5 text-[12px] font-semibold text-[#0F172A]"
          >
            Refresh
          </button>
        </div>
        <label htmlFor="customer-search" className="sr-only">
          Search customers
        </label>
        <input
          id="customer-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="h-10 rounded-[10px] border border-[#CBD5E1] px-3 text-[13px]"
        />

        {loading && !customers.length ? (
          <Empty>Loading customers...</Empty>
        ) : !filtered.length ? (
          <Empty>
            {customers.length ? "No matches." : "No customers yet."}
          </Empty>
        ) : (
          filtered.map((c) => {
            const isSelected = c.id === selectedId;
            const suburb = suburbOf(c.address);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setPickedId(c.id)}
                className="flex items-center gap-2.5 rounded-[10px] p-2.5 text-left"
                style={{ background: isSelected ? "#FFF7E6" : "#FFFFFF" }}
              >
                <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[#F68A0A] text-[12px] font-bold text-[#3B1D00]">
                  {initialsOf(c)}
                </span>
                <span className="flex min-w-0 flex-grow flex-col">
                  <span className="truncate text-[14px] font-semibold text-[#0F172A]">
                    {nameOf(c)}
                  </span>
                  {suburb ? (
                    <span className="truncate text-[12px] text-[#5B6B80]">
                      {suburb}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })
        )}
      </aside>

      <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-4 px-6 pb-14 pt-5">
        {!selected ? (
          <section className={PANEL}>
            <Empty>
              Select a customer to see their design and project details.
            </Empty>
          </section>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <div
                role="tablist"
                aria-label="Customer views"
                className="flex gap-1 rounded-[12px] bg-white p-1 ring-1 ring-[#E3E8EF]"
              >
                {(
                  [
                    ["record", "Customer record"],
                    ["design", "Design & job"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    role="tab"
                    type="button"
                    aria-selected={tab === key}
                    onClick={() => setTab(key)}
                    className={`h-9 rounded-[9px] px-3.5 text-[13px] font-semibold ${tab === key ? "bg-[#0B1A2E] text-white" : "text-[#334155] hover:bg-[#F1F5F9]"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className="flex-grow" />
              <Link
                href={`/installers/dashboard/project-workflow?customerId=${selected.id}`}
                className="text-[13px] font-semibold text-[#1565C0]"
              >
                Open project workflow
              </Link>
              {design ? (
                <Link
                  href={`/designs?customerId=${selected.id}&designId=${design.id}`}
                  className="flex h-9 items-center rounded-[10px] bg-[#0B1A2E] px-3.5 text-[13px] font-semibold text-white no-underline"
                >
                  Open designer
                </Link>
              ) : null}
            </div>

            {tab === "record" ? (
              panel.loading && !panel.lead ? (
                <section className={PANEL}>
                  <Empty>Loading the customer record...</Empty>
                </section>
              ) : panel.lead?.id ? (
                // The same record EasyLink staff see (without EasyLink's costs and profit):
                // the whole history from when the customer was first registered.
                <CustomerRecordView
                  key={panel.lead.id}
                  portal="installers"
                  leadId={panel.lead.id}
                />
              ) : (
                <section className={PANEL}>
                  <Empty>
                    This customer has no lead yet, so there is no history to
                    show. Their design and job details are under Design &amp;
                    job.
                  </Empty>
                </section>
              )
            ) : (
              <>
                <section className={PANEL}>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="m-0 flex-grow font-source-sans text-[26px] font-bold text-[#0F172A]">
                      {nameOf(selected)}
                    </h1>
                    {panel.lead?.status ? (
                      <span className="rounded-full bg-[#FFE7C2] px-2.5 py-[3px] text-[12px] font-bold text-[#3B1D00]">
                        {panel.lead.status}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-[13px] text-[#475569]">
                    {[
                      selected.address,
                      selected.phone,
                      selected.email,
                      selected.homeProfile?.customerType,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No contact details on file."}
                  </p>
                </section>

                <section className={PANEL}>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="m-0 flex-grow text-[16px] font-bold text-[#0F172A]">
                      Solar design
                    </h2>
                  </div>

                  {panel.loading ? (
                    <Empty>Loading design...</Empty>
                  ) : !design ? (
                    <Empty>No design for this customer yet.</Empty>
                  ) : (
                    <>
                      <div className="mt-3 grid gap-4 md:grid-cols-2">
                        <div className="flex flex-col gap-2">
                          <SpecRow label="Design" value={design.title} />
                          <SpecRow
                            label="Address"
                            value={design.address ?? "-"}
                          />
                          <SpecRow
                            label="Panel count"
                            value={
                              design.panelCount != null
                                ? String(design.panelCount)
                                : "-"
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <SpecRow label="Status" value={design.status} />
                          <SpecRow
                            label="Roof area"
                            value={
                              design.roofArea != null
                                ? `${design.roofArea} m²`
                                : "-"
                            }
                          />
                          <SpecRow
                            label="Panel : inverter"
                            value={
                              ratio
                                ? `${ratio.pct}% of ${ratio.limitPct}%`
                                : "-"
                            }
                          />
                        </div>
                      </div>

                      {ratio ? (
                        <p
                          role={ratio.overLimit ? "alert" : "status"}
                          className="mt-3 mb-0 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold"
                          style={
                            ratio.overLimit
                              ? { background: "#FEF2F2", color: "#991B1B" }
                              : { background: "#F0FDF4", color: "#166534" }
                          }
                        >
                          {ratio.message}
                        </p>
                      ) : null}
                    </>
                  )}
                </section>

                <section className="flex flex-col gap-2.5">
                  <div className="flex items-center">
                    <h2 className="m-0 flex-grow text-[16px] font-bold text-[#0F172A]">
                      Equipment
                    </h2>
                    <Link
                      href="/installers/dashboard/equipment"
                      className="text-[13px] font-semibold text-[#1565C0]"
                    >
                      Browse catalogue
                    </Link>
                  </div>
                  {!equipment.length ? (
                    <div className={PANEL}>
                      <Empty>No equipment attached to this design yet.</Empty>
                    </div>
                  ) : (
                    <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(280px,100%),1fr))]">
                      {equipment.map(({ kind, item }) => (
                        <div
                          key={kind}
                          className={`${PANEL} flex flex-col gap-2`}
                        >
                          <div className="flex items-center gap-2">
                            <strong className="flex-grow text-[12px] uppercase tracking-[0.06em] text-[#0F172A]">
                              {kind}
                            </strong>
                            {cecApprovedLabel(item) === "Yes" ? (
                              <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-bold text-[#166534]">
                                CEC approved
                              </span>
                            ) : null}
                          </div>
                          <span className="text-[14px] font-semibold text-[#0F172A]">
                            {productLabel(item) ?? "-"}
                          </span>
                          <span className="text-[12px] text-[#5B6B80]">
                            Qty {item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(380px,100%),1fr))] items-start">
                  <section className={`${PANEL} flex flex-col gap-2`}>
                    <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">
                      Appointment schedule
                    </h2>
                    {!panel.appointments.length ? (
                      <Empty>No appointments booked.</Empty>
                    ) : (
                      panel.appointments.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center gap-2.5 border-b border-[#EEF2F6] py-2 last:border-0"
                        >
                          <span className="flex flex-grow flex-col">
                            <span className="text-[14px] font-semibold text-[#0F172A]">
                              {a.title}
                            </span>
                            <span className="text-[12px] text-[#5B6B80]">
                              {new Date(a.startAt).toLocaleString("en-AU")}
                            </span>
                          </span>
                          <span className="rounded-full bg-[#DBEAFE] px-2 py-0.5 text-[12px] font-bold text-[#1E40AF]">
                            {a.status}
                          </span>
                        </div>
                      ))
                    )}
                  </section>

                  <div className="flex flex-col gap-4">
                    <section className={`${PANEL} flex flex-col gap-2`}>
                      <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">
                        Notes
                      </h2>
                      {!panel.notes.length ? (
                        <Empty>No notes yet.</Empty>
                      ) : (
                        panel.notes.map((n) => (
                          <div
                            key={n.id}
                            className="flex flex-col gap-0.5 border-b border-[#EEF2F6] py-2 last:border-0"
                          >
                            <span className="text-[13px] font-semibold text-[#0F172A]">
                              {n.title}
                            </span>
                            <span className="text-[13px] text-[#475569]">
                              {n.content}
                            </span>
                          </div>
                        ))
                      )}
                    </section>

                    <section className={`${PANEL} flex flex-col gap-2`}>
                      <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">
                        Tasks &amp; tags
                      </h2>
                      {!panel.tasks.length ? (
                        <Empty>No tasks yet.</Empty>
                      ) : (
                        // Tasks carry no done/open state in the API, so this lists
                        // them rather than showing a checkbox that could not
                        // reflect whether the work is finished.
                        panel.tasks.map((t) => (
                          <div
                            key={t.id}
                            className="flex flex-col gap-0.5 border-b border-[#EEF2F6] py-2 last:border-0"
                          >
                            <span className="text-[13px] font-semibold text-[#0F172A]">
                              {t.title}
                            </span>
                            <span className="text-[13px] text-[#475569]">
                              {t.content}
                            </span>
                          </div>
                        ))
                      )}
                      {panel.tags.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {panel.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="rounded-full bg-[#DBEAFE] px-2.5 py-[3px] text-[12px] font-semibold text-[#1E40AF]"
                            >
                              {tag.value}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </section>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
