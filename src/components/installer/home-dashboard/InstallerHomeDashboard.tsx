"use client";

import classNames from "classnames";
import { useMemo } from "react";
import type { InstallerDashboardSubTab } from "@/components/installer/dashboard/InstallerDashboardShell";
import type { InstallerDashboardShellContext } from "@/components/installer/dashboard/InstallerDashboardShell";
import { InstallerDashboardShell } from "@/components/installer/dashboard/InstallerDashboardShell";
import type { InstallerCustomerSummary } from "@/lib/installers/customers";
import {
  type InstallerCustomerDesign,
  type InstallerDesignProduct,
} from "@/lib/installers/designs";
import {
  batteryCapacityKwh,
  cecApprovedLabel,
  inverterRatedKw,
  numberSpec,
  productLabel,
  productSeries,
  productsByCategory,
  systemSizeKwFrom,
  NOT_AVAILABLE,
  NO_VALUE,
} from "@/lib/designs/product-specs";
import {
  INSTALLER_HOME_EQUIPMENT,
  INSTALLER_HOME_FINANCE,
} from "./installerHomeMock";
import { InstallerHomeAppointmentsPanel } from "./InstallerHomeAppointmentsPanel";
import { InstallerHomeCustomerCommunication } from "./InstallerHomeCustomerCommunication";
import { InstallerHomeCustomerPanels } from "./InstallerHomeCustomerPanels";
import { InstallerHomeCustomerProfileStrip } from "./InstallerHomeCustomerProfileStrip";
import { InstallerHomeEquipmentSection } from "./InstallerHomeEquipmentSection";
import { InstallerHomePipelineStatus } from "./InstallerHomePipelineStatus";
import { InstallerHomeSolarDesignCard } from "./InstallerHomeSolarDesignCard";
import { InstallerHomeQuotesCard } from "./InstallerHomeQuotesCard";
import type { InstallerHomePanelState } from "@/hooks/useInstallerHomePanel";

function formatCurrency(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value?: number | null, suffix = "") {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${new Intl.NumberFormat("en-AU", {
    maximumFractionDigits: 1,
  }).format(value)}${suffix}`;
}

function designProductsTotal(design?: InstallerCustomerDesign | null) {
  return (
    design?.products?.reduce((total, item) => total + (item.totalPrice ?? 0), 0) ??
    0
  );
}

function productsForCategory(
  design: InstallerCustomerDesign | null,
  category: string,
): InstallerDesignProduct[] {
  return productsByCategory(design?.products, category);
}

function productByCategory(
  design: InstallerCustomerDesign | null,
  category: string,
): InstallerDesignProduct | undefined {
  return productsForCategory(design, category)[0];
}

/** "Model A, Model B ×2" — every attached item in a category, not just the first. */
function joinedProductNames(items: InstallerDesignProduct[]): string {
  if (items.length === 0) return NOT_AVAILABLE;
  return items
    .map((item) => {
      const name = productLabel(item) ?? "—";
      return item.quantity > 1 ? `${name} ×${item.quantity}` : name;
    })
    .join(", ");
}

function systemSizeKw(design?: InstallerCustomerDesign | null) {
  return systemSizeKwFrom(
    productByCategory(design ?? null, "panel"),
    design?.panelCount,
  );
}

function buildEquipment(
  design: InstallerCustomerDesign | null,
): typeof INSTALLER_HOME_EQUIPMENT {
  const panelItems = productsForCategory(design, "panel");
  const inverterItems = productsForCategory(design, "inverter");
  const batteryItems = productsForCategory(design, "battery");
  const evChargerItems = productsForCategory(design, "ev charger");
  const heatPumpItems = productsForCategory(design, "heat pump");

  const panel = panelItems[0];
  const inverter = inverterItems[0];
  const battery = batteryItems[0];
  const evCharger = evChargerItems[0];
  const heatPump = heatPumpItems[0];

  const kw = systemSizeKw(design);
  const batteryKwh = batteryCapacityKwh(battery);
  const inverterKw = inverterRatedKw(inverter);
  const evChargerKw = inverterRatedKw(evCharger);
  const heatPumpCapacityL = numberSpec(heatPump?.product, "capacityL");

  return {
    solar: [
      { label: "System Size", value: kw ? `${kw.toFixed(1)} kW` : "-" },
      { label: "Panel Name", value: joinedProductNames(panelItems) },
      { label: "Model", value: panel?.product?.sku || "-" },
      {
        label: "Panel Watts",
        value: panel?.product?.wattage ? `${panel.product.wattage}W` : "-",
      },
      { label: "Qty", value: String(design?.panelCount ?? panel?.quantity ?? "-") },
    ],
    battery: [
      { label: "Battery Model", value: joinedProductNames(batteryItems) },
      {
        label: "Capacity",
        value:
          batteryKwh !== undefined ? `${formatNumber(batteryKwh)} kWh` : NO_VALUE,
      },
      { label: "Series", value: productSeries(battery) ?? NO_VALUE },
      { label: "CEC Approved", value: cecApprovedLabel(battery) ?? NO_VALUE },
    ],
    equipment: [
      { label: "Inverter", value: joinedProductNames(inverterItems) },
      {
        label: "Rated Output",
        value:
          inverterKw !== undefined ? `${formatNumber(inverterKw)} kW` : NO_VALUE,
      },
      { label: "CEC Approved", value: cecApprovedLabel(inverter) ?? NO_VALUE },
    ],
    evCharger: [
      { label: "Model", value: joinedProductNames(evChargerItems) },
      {
        label: "Rating",
        value: evChargerKw !== undefined ? `${formatNumber(evChargerKw)} kW` : NO_VALUE,
      },
    ],
    heatPump: [
      { label: "Model", value: joinedProductNames(heatPumpItems) },
      {
        label: "Capacity",
        value: heatPumpCapacityL !== undefined ? `${heatPumpCapacityL} L` : NO_VALUE,
      },
    ],
    site: [
      { label: "Address", value: design?.address || "-" },
      { label: "Roof Area", value: formatNumber(design?.roofArea, " m2") },
      {
        label: "Annual Sunlight",
        value: formatNumber(design?.annualSunlight, " hrs"),
      },
      { label: "Design Status", value: design?.status.replace("_", " ") || "-" },
    ],
  };
}

function buildFinance(
  design: InstallerCustomerDesign | null,
): typeof INSTALLER_HOME_FINANCE {
  const equipmentCost = designProductsTotal(design);
  const salePrice = design?.estimatedSavings
    ? design.estimatedSavings * 8
    : equipmentCost;
  const installerCost = equipmentCost ? equipmentCost * 0.75 : undefined;

  return [
    { label: "STC Panel", value: design?.panelCount ? `${design.panelCount} panels` : "-" },
    {
      label: "STC BESS",
      value: productByCategory(design, "battery") ? "Included" : NOT_AVAILABLE,
    },
    { label: "Payment Type", value: "Finance" },
    { label: "Payment Status", value: design?.lead?.status || design?.status || "-" },
    { label: "Installer Cost", value: formatCurrency(installerCost) },
    { label: "Equipment Cost", value: formatCurrency(equipmentCost) },
    { label: "Sale Price", value: formatCurrency(salePrice) },
  ].slice(0, INSTALLER_HOME_FINANCE.length) as typeof INSTALLER_HOME_FINANCE;
}

export function InstallerHomeDashboard({
  activeSubTab,
}: {
  activeSubTab: Exclude<InstallerDashboardSubTab, "schedule">;
}) {
  return (
    <InstallerDashboardShell
      activeSubTab={activeSubTab}
      homePanelEnabled={activeSubTab === "detail"}
    >
      {({ selectedCustomerId, selectedCustomer, homePanel }) =>
        activeSubTab === "pipeline" ? (
          <InstallerHomePipelineStatus />
        ) : homePanel ? (
          <InstallerHomeDetail
            selectedCustomerId={selectedCustomerId}
            selectedCustomer={selectedCustomer}
            homePanel={homePanel}
          />
        ) : null
      }
    </InstallerDashboardShell>
  );
}

function InstallerHomeDetail({
  selectedCustomerId,
  selectedCustomer,
  homePanel,
}: InstallerDashboardShellContext & {
  homePanel: InstallerHomePanelState;
}) {
  // Customer profile and design both come from the single installer-home-panel
  // request already made by the shell — no separate fetch here.
  const { customer, design, loading, loadError: error } = homePanel;

  const customerForDisplay = useMemo<InstallerCustomerSummary | null>(() => {
    if (customer) return customer;
    if (!selectedCustomer) return null;
    const [firstName, ...lastNameParts] = selectedCustomer.name.split(" ");
    return {
      id: selectedCustomer.id,
      firstName,
      lastName: lastNameParts.join(" "),
      email: selectedCustomer.email,
    };
  }, [customer, selectedCustomer]);

  const equipment = useMemo(() => buildEquipment(design), [design]);
  const finance = useMemo(() => buildFinance(design), [design]);

  return (
    <>
      {loading || error || !design ? (
        <div className="mb-3 rounded-lg border border-warm-border bg-cream-50 px-4 py-3 font-dm-sans text-sm text-warm-gray">
          {loading
            ? "Loading selected customer solar design..."
            : error
              ? error
              : "No solar design found for the selected customer."}
        </div>
      ) : null}

      <InstallerHomeSolarDesignCard design={design} customer={customerForDisplay} />

      {!loading ? (
        <InstallerHomeQuotesCard leadId={homePanel.lead?.id ?? null} design={design} customer={customerForDisplay} customerId={selectedCustomerId} />
      ) : null}

      <InstallerHomeEquipmentSection
        design={design}
        baseEquipment={equipment}
        onDesignUpdated={homePanel.setDesign}
      />

          <InstallerHomeCustomerProfileStrip
            customerId={selectedCustomerId}
            customer={customerForDisplay}
            design={design}
            documents={homePanel.documents}
            documentsLoading={homePanel.loading}
            documentsError={homePanel.loadError}
            onCustomerUpdated={homePanel.setCustomer}
            onDocumentUploaded={homePanel.upsertDocument}
            onDocumentDeleted={homePanel.removeDocument}
          />

          {/* Finance strip */}
          <section className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-warm-border bg-warm-border md:grid-cols-3 xl:grid-cols-6">
            {finance.map((cell) => (
              <div
                key={cell.label}
                className="bg-white px-3 py-3 text-center md:py-4"
              >
                <p className="font-inter text-[11px] font-medium uppercase tracking-wide text-warm-gray md:text-xs">
                  {cell.label}
                </p>
                <p className="mt-2 font-inter text-sm font-semibold text-warm-ink md:text-[15px]">
                  {cell.value}
                </p>
              </div>
            ))}
          </section>

          <InstallerHomeCustomerCommunication customerId={selectedCustomerId} />

          {/* Bottom panels */}
          <div className="mt-6 space-y-6 pb-10">
            <InstallerHomeAppointmentsPanel
              nodeId="3:9097"
              customerId={selectedCustomerId}
              appointments={homePanel.appointments}
              loading={homePanel.loading}
              loadError={homePanel.loadError}
            />
            <InstallerHomeCustomerPanels panel={homePanel} />
          </div>
    </>
  );
}
