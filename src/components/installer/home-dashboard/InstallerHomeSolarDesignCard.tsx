"use client";

import { useState } from "react";
import Link from "next/link";
import { SendDesignDialog } from "@/components/designs/SendDesignDialog";
import { DesignShareBadge } from "@/components/designs/DesignShareBadge";
import Icon from "@/components/ui/Icons";
import { DesignMapPreviewImage } from "@/components/customer/design/DesignMapPreviewImage";
import { designMapScreenshotUrl } from "@/lib/designs/map-screenshot";
import { designStaticMapUrl } from "@/lib/designs/static-map";
import type { InstallerCustomerDesign } from "@/lib/installers/designs";
import type { InstallerCustomerSummary } from "@/lib/installers/customers";

/**
 * The installer already has this customer's name/email/phone from
 * registering them — the Designer's own contact-details step would just be
 * asking for the same thing again, so this link carries it along and the
 * wizard skips straight past that step when it sees a `customerId`.
 *
 * When the customer already has a design, `designId` is included too —
 * without it the builder always opens in "create" mode and any edit lands on
 * a brand-new design instead of updating the one shown on this job page.
 */
function designerHref(
  customer: InstallerCustomerSummary | null,
  designId?: string | null,
): string {
  if (!customer) return "/designs";
  const params = new URLSearchParams({ customerId: customer.id });
  if (customer.firstName) params.set("firstName", customer.firstName);
  if (customer.lastName) params.set("lastName", customer.lastName);
  if (customer.email) params.set("email", customer.email);
  if (customer.phone) params.set("phone", customer.phone);
  if (customer.address) params.set("address", customer.address);
  if (designId) params.set("designId", designId);
  return `/designs?${params.toString()}`;
}

/** Figma node 3:8616 — rooftop preview asset (expires on MCP host after ~7 days). */
export const INSTALLER_SOLAR_DESIGN_PREVIEW_URL =
  "/images/home/installer-solar-design.png";

function ExternalLinkGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
    </svg>
  );
}

function SolarSpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-[19.875px] min-w-0 items-center justify-between gap-3 font-dm-sans">
      <span className="shrink-0 text-[13.25px] leading-[19.875px] text-warm-gray">
        {label}
      </span>
      <span
        className="min-w-0 truncate text-right text-[13.25px] font-medium leading-[19.875px] text-warm-ink"
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberFromRecord(value: unknown, key: string) {
  if (!isRecord(value)) return undefined;
  const raw = value[key];
  return typeof raw === "number" && Number.isFinite(raw) ? raw : undefined;
}

function formatNumber(value?: number | null, maximumFractionDigits = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-AU", { maximumFractionDigits }).format(
    value,
  );
}

function formatCurrency(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Last updated: -";
  return `Last updated: ${date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;
}

function formatDateValue(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(status: InstallerCustomerDesign["status"]) {
  return status;
}

function dbValue(value?: string | number | null) {
  if (typeof value === "number") return formatNumber(value, 1);
  return value?.trim() || "-";
}

function buildSolarDesignRows(design?: InstallerCustomerDesign | null) {
  if (!design) {
    return {
      designSpecs: [
        { label: "Design Title", value: "-" },
        { label: "Address", value: "-" },
        { label: "Panel Count", value: "-" },
        { label: "Roof Area", value: "-" },
        { label: "Annual Sunlight", value: "-" },
      ],
      performance: [
        { label: "Annual Output", value: "-" },
        { label: "Estimated Savings", value: "-" },
        { label: "Design Status", value: "-" },
        { label: "Created At", value: "-" },
        { label: "Updated At", value: "-" },
      ],
      footer: {
        status: "No design selected",
        updated: "Last updated: -",
        savings: "Estimated savings: -",
      },
    };
  }

  const yearlyEnergy =
    numberFromRecord(design.solarData, "yearlyEnergyDcKwh") ??
    numberFromRecord(design.solarData, "annualOutputKwh");

  const estimatedSavings = formatCurrency(design.estimatedSavings);

  return {
    designSpecs: [
      {
        label: "Design Title",
        value: dbValue(design.title),
      },
      {
        label: "Address",
        value: dbValue(design.address),
      },
      {
        label: "Panel Count",
        value: formatNumber(design.panelCount),
      },
      {
        label: "Roof Area",
        value:
          typeof design.roofArea === "number"
            ? `${formatNumber(design.roofArea, 1)} m2`
            : "-",
      },
      {
        label: "Annual Sunlight",
        value:
          typeof design.annualSunlight === "number"
            ? `${formatNumber(design.annualSunlight, 0)} hrs`
            : "-",
      },
    ],
    performance: [
      {
        label: "Annual Output",
        value:
          typeof yearlyEnergy === "number"
            ? `${formatNumber(yearlyEnergy, 0)} kWh`
            : "-",
      },
      {
        label: "Estimated Savings",
        value: formatCurrency(design.estimatedSavings),
      },
      {
        label: "Design Status",
        value: statusLabel(design.status),
      },
      {
        label: "Created At",
        value: formatDateValue(design.createdAt),
      },
      {
        label: "Updated At",
        value: formatDateValue(design.updatedAt),
      },
    ],
    footer: {
      status: statusLabel(design.status),
      updated: formatDateLabel(design.updatedAt),
      savings:
        estimatedSavings === "-"
          ? "Estimated savings: -"
          : `Estimated savings: ${estimatedSavings}/yr`,
    },
  };
}

export function InstallerHomeSolarDesignCard({
  design,
  customer,
}: {
  design?: InstallerCustomerDesign | null;
  customer?: InstallerCustomerSummary | null;
}) {
  const sd = buildSolarDesignRows(design);
  const [sending, setSending] = useState(false);
  const [sharedAt, setSharedAt] = useState<{ at: string | null; channels: string | null } | null>(null);
  const shareDesign = design
    ? {
        sharedAt: sharedAt?.at ?? design.sharedWithCustomerAt ?? null,
        sharedChannels: sharedAt?.channels ?? design.sharedChannels ?? null,
        updatedAt: sharedAt?.at ?? String(design.updatedAt ?? ""),
      }
    : null;
  const customerName = [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") || "the customer";

  return (
    <section
      data-node-id="3:8616"
      className="overflow-hidden rounded-[11px] border border-warm-border bg-cream-50"
    >
      {/* Header strip: left yellow rule + amber wash (Figma 3:8617) */}
      <header className="flex min-h-[43px] items-center justify-between gap-3 border-b border-warm-border bg-linear-to-b from-[rgba(245,159,10,0.15)] to-transparent py-2 pl-[17px] pr-[17px] border-l-[2.3px] border-l-yellow-lemon">
        <div className="flex min-w-0 items-center gap-[10px]">
          <Icon name="Sun" className="size-[17.65px] shrink-0 text-warm-ink" />
          <span className="truncate font-inter text-[13.25px] font-bold uppercase leading-[19.875px] tracking-[0.33px] text-warm-ink">
            Solar Design
          </span>
        </div>
        <Link
          href={designerHref(customer ?? null, design?.id)}
          prefetch={false}
          className="inline-flex shrink-0 items-center gap-[6px] font-dm-sans text-[11px] font-semibold leading-[16.56px] text-[#333333] hover:opacity-80"
        >
          Open Designer
          <ExternalLinkGlyph className="size-[13.24px] shrink-0 text-[#333333]" />
        </Link>
      </header>
      {design?.id && shareDesign ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-warm-border px-[17px] py-2">
          <span className="font-dm-sans text-[12px] font-medium text-warm-gray">Customer&rsquo;s copy</span>
          <DesignShareBadge design={shareDesign} onSend={() => setSending(true)} />
        </div>
      ) : null}
      {sending && design?.id ? (
        <SendDesignDialog
          portal="installers"
          designId={design.id}
          customerName={customerName}
          phone={customer?.phone}
          email={customer?.email}
          onClose={() => setSending(false)}
          onSent={(r) => {
            if (r.sharedAt) setSharedAt({ at: r.sharedAt, channels: [r.email === "sent" ? "EMAIL" : null, r.sms === "sent" ? "SMS" : null].filter(Boolean).join(",") });
          }}
        />
      ) : null}

      {/* Three-column body (Figma 3:8636): image | specs | performance */}
      <div className="grid gap-[17px] px-[17px] pt-[17px] lg:grid-cols-[minmax(0,375px)_minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-[17px] lg:gap-y-0">
        {/* Image frame: golden border (3:8705–3:8706) */}
        <div className="flex shrink-0 flex-col overflow-hidden rounded-[11px] border-[1.157px] border-amber-soft p-[1.157px] lg:max-w-[375px]">
          <div className="relative aspect-373/174 w-full overflow-hidden rounded-[9.89px] bg-cream-200">
            <DesignMapPreviewImage
              // Saved panel-layout capture when the design has one, otherwise a
              // real satellite view of the property — the stock rooftop is the
              // last resort, for a design with no location at all.
              src={designMapScreenshotUrl(design) ?? designStaticMapUrl(design)}
              defaultSrc={INSTALLER_SOLAR_DESIGN_PREVIEW_URL}
              alt="Solar roof design preview"
              sizes="(max-width: 1024px) 100vw, 375px"
              priority
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-[8.825px] pt-0 lg:max-w-[360px]">
          <h4 className="font-inter text-[12.146px] font-semibold leading-[18.22px] text-warm-ink">
            Design Specifications
          </h4>
          <div className="flex min-w-0 flex-col gap-[4.413px] overflow-hidden">
            {sd.designSpecs.map((row) => (
              <SolarSpecRow
                key={row.label}
                label={row.label}
                value={row.value}
              />
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-[8.825px] pt-0 lg:max-w-[360px]">
          <h4 className="font-inter text-[12.146px] font-semibold leading-[18.22px] text-warm-ink">
            Performance Estimates
          </h4>
          <div className="flex min-w-0 flex-col gap-[4.413px] overflow-hidden">
            {sd.performance.map((row) => (
              <SolarSpecRow
                key={row.label}
                label={row.label}
                value={row.value}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer row (Figma 3:8707) */}
      <footer className="mx-[17px] mt-[17px] mb-[14px] flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-warm-border pt-[10px]">
        <div className="flex min-w-0 flex-wrap items-center gap-x-[22px] gap-y-2">
          <span className="inline-flex items-center gap-[10px]">
            <span
              className="size-[8.83px] shrink-0 rounded-full bg-leaf"
              aria-hidden
            />
            <span
              className="truncate font-dm-sans text-[11px] font-medium leading-[16.56px] text-warm-gray"
              title={sd.footer.status}
            >
              {sd.footer.status}
            </span>
          </span>
          <span className="font-dm-sans text-[11px] leading-[16.56px] text-[rgba(124,115,106,0.6)]">
            {sd.footer.updated}
          </span>
        </div>
        <span
          className="min-w-0 truncate bg-linear-to-br from-brand-blue to-brand-teal bg-clip-text font-dm-sans text-[11px] font-semibold leading-[16.56px] text-transparent"
          title={sd.footer.savings}
        >
          {sd.footer.savings}
        </span>
      </footer>
    </section>
  );
}
