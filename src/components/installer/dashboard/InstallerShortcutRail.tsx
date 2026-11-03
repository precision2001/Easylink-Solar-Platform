"use client";

import classNames from "classnames";
import Link from "next/link";
import Image from "next/image";
import { createPortal } from "react-dom";
import { memo, useEffect, useMemo, useState } from "react";
import Icon from "@/components/ui/Icons";
import {
  InstallerCustomerImportModal,
  type CustomerImportSource,
} from "@/components/installer/customer-import/InstallerCustomerImportModal";
import { InstallerCreateAppointmentModal } from "@/components/installer/appointments/InstallerCreateAppointmentModal";
import { InstallerCreateNoteModal } from "@/components/installer/notes/InstallerCreateNoteModal";
import { InstallerCreateTaskModal } from "@/components/installer/tasks/InstallerCreateTaskModal";
import { InstallerCreateTagModal } from "@/components/installer/tags/InstallerCreateTagModal";
import { InstallerPaymentsModal } from "@/components/installer/payments/InstallerPaymentsModal";
import type { InstallerCustomerSummary } from "@/lib/installers/customers";
import type { InstallerAppointment } from "@/lib/installers/appointments";
import type { InstallerNote } from "@/lib/installers/notes";
import type { InstallerTask } from "@/lib/installers/tasks";
import type { InstallerTag } from "@/lib/installers/tags";
import {
  IconCheckSquare,
  IconPanelTag,
} from "@/components/installer/dashboard/installerDashboardIcons";
/** --- Figma 3:9234 shortcut rail --- */
function ShortcutRailGradientChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex size-[35.32px] shrink-0 items-center justify-center rounded-[8.833px] bg-linear-to-b from-yellow-lemon to-orange-amber text-warm-black [&_svg]:size-[17.651px]">
      {children}
    </span>
  );
}

function ShortcutRailBrandChip({
  bgClassName,
  children,
}: {
  bgClassName: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={classNames(
        "flex size-[35.32px] shrink-0 items-center justify-center rounded-[8.833px] text-white [&_svg]:size-[17.651px]",
        bgClassName,
      )}
    >
      {children}
    </span>
  );
}

function ShortcutRailLabel({
  tall,
  children,
}: {
  tall?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={classNames(
        "text-center font-dm-sans text-[9.938px] font-semibold leading-[12.422px] text-warm-gray",
        tall &&
          "flex min-h-[24.849px] flex-col justify-center [&_span]:leading-[12.422px]",
      )}
      style={{ fontVariationSettings: "'opsz' 14" }}
    >
      {children}
    </span>
  );
}

function ShortcutRailCard({
  tall,
  chip,
  label,
  href,
  onClick,
  disabled,
  title,
}: {
  tall?: boolean;
  chip: React.ReactNode;
  label: React.ReactNode;
  /** When set, renders Next.js Link instead of `<button>` (appointment → schedule page). */
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  const cls = classNames(
    "flex w-full flex-col items-center rounded-[11.042px] border-[1.157px] border-warm-border bg-cream-50 px-[1.157px] pb-[9.892px] pt-[9.982px]",
    tall ? "min-h-[84.457px]" : "h-[72.032px]",
    "gap-[4.413px]",
    href && "text-left no-underline transition-opacity hover:opacity-95",
    onClick && !disabled && "transition-opacity hover:opacity-95",
    disabled && "cursor-not-allowed opacity-50",
  );

  const body = (
    <>
      {chip}
      <ShortcutRailLabel tall={tall}>{label}</ShortcutRailLabel>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cls}>
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={cls}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
    >
      {body}
    </button>
  );
}

function ShortcutIconFolder({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"
      />
    </svg>
  );
}

function ShortcutIconBook({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  );
}

function ShortcutIconCreditCard({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

function ShortcutIconExcelMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M14 3l2.5 7H22v2h-4.25L17 21h-2l-2.25-9H9L6.75 21h-2L7 12H3v-2h4.5L10 3h4z" />
    </svg>
  );
}

function ShortcutIconSheetGrid({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" />
    </svg>
  );
}

function ShortcutIconWordMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M4 4h6l2 10L14 4h6v16h-3V9l-3 11h-3L9 9v11H6V4z" />
    </svg>
  );
}

/** Figma 3:10191 — Solar Designer Auto Fetch modal */
function SolarDesignerAutoFetchModal({
  open,
  onClose,
  customerName,
}: {
  open: boolean;
  onClose: () => void;
  /** The selected customer's name; the line is hidden when none is selected. */
  customerName: string | null;
}) {
  const [installationAddress, setInstallationAddress] = useState("");

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const nextSteps = [
    "Geolocate property & analyse rooftop via satellite",
    "Calculate optimal panel placement & system size",
    "Auto-recommend inverter & battery configuration",
    "Generate performance estimates, savings & payback",
  ] as const;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-[rgba(47,47,47,0.67)] backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="solar-designer-auto-fetch-title"
        className="relative z-[1] max-h-[min(90vh,420px)] w-full max-w-[518px] overflow-y-auto rounded-[12px] border border-warm-border bg-white shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]"
        data-node-id="3:10191"
      >
        <div className="relative bg-linear-to-b from-yellow-lemon to-orange-amber px-3 py-3">
          <div className="flex items-center gap-[10px] pr-10">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-[7.718px] bg-navy-800">
              <Image
                src="/images/solarDesignLogo.png"
                alt=""
                width={22}
                height={22}
                className="object-contain"
              />
            </div>
            <h2
              id="solar-designer-auto-fetch-title"
              className="font-inter text-[14px] font-bold leading-[21px] text-warm-black"
            >
              Solar Designer – Auto Fetch
            </h2>
          </div>
          <button
            type="button"
            className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-[rgba(28,26,23,0.1)] text-warm-black hover:bg-[rgba(28,26,23,0.18)]"
            onClick={onClose}
            aria-label="Close"
          >
            <svg
              className="size-[14px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 pb-5 pt-4">
          {customerName ? (
            <p className="font-dm-sans text-[12px] leading-[18px] text-warm-gray">
              <span>Customer: </span>
              <span
                className="font-bold text-warm-ink"
                style={{ fontVariationSettings: "'opsz' 14" }}
                data-clarity-mask="true"
              >
                {customerName}
              </span>
            </p>
          ) : null}

          <div className="flex flex-col gap-[6px]">
            <label
              htmlFor="solar-fetch-address"
              className="font-dm-sans text-[10px] font-semibold uppercase tracking-[0.3px] text-warm-gray"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              Installation Address *
            </label>
            <div className="relative">
              <span
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray"
                aria-hidden
              >
                <Icon name="LocationPin" className="size-4" />
              </span>
              <input
                id="solar-fetch-address"
                type="text"
                value={installationAddress}
                onChange={(e) => setInstallationAddress(e.target.value)}
                placeholder="e.g. 42 Bondi Rd, Bondi, NSW 2026"
                autoComplete="street-address"
                className="w-full rounded-lg border border-warm-border bg-cream-50 py-2.5 pl-9 pr-3 font-dm-sans text-[13px] text-warm-ink outline-none placeholder:text-warm-gray/40"
                style={{ fontVariationSettings: "'opsz' 9" }}
              />
            </div>
          </div>

          <div className="rounded-lg bg-cream-200 px-3 pb-3 pt-3">
            <p
              className="font-dm-sans text-[10px] font-semibold leading-[15px] text-warm-ink"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              What happens next?
            </p>
            <ul className="mt-2 flex flex-col gap-1 font-dm-sans text-[10px] leading-[15px] text-warm-gray">
              {nextSteps.map((line) => (
                <li key={line} className="flex gap-2">
                  <span
                    className="mt-0.5 shrink-0 text-orange-amber"
                    aria-hidden
                  >
                    ›
                  </span>
                  <span style={{ fontVariationSettings: "'opsz' 9" }}>
                    {line}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              className="h-9 min-w-[80px] rounded-lg border border-warm-border bg-white font-dm-sans text-[11px] font-bold text-warm-gray hover:bg-cream-50"
              style={{ fontVariationSettings: "'opsz' 14" }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex h-9 min-w-[170px] items-center justify-center gap-2 rounded-lg bg-linear-to-b from-yellow-lemon to-orange-amber px-4 font-dm-sans text-[11px] font-bold text-warm-black hover:opacity-95"
              style={{ fontVariationSettings: "'opsz' 14" }}
              onClick={() => {
                void installationAddress;
                // TODO: call solar design auto-fetch API
              }}
            >
              <Icon name="Search" className="size-[14px] shrink-0" />
              Fetch Solar Design
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Figma 3:9228 — Solar Design shortcut (gradient tile + centred mark + label) */
function ShortcutRailSolarDesignButton({ onPress }: { onPress: () => void }) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="flex h-[72.032px] w-full flex-col items-center gap-[4.413px] rounded-[11.042px] border-[1.157px] border-warm-border px-[1.157px] pb-[9.892px] pt-[9.982px] transition-opacity hover:opacity-95"
      style={{
        backgroundImage:
          "linear-gradient(125.24deg, rgb(84, 116, 235) 16.14%, rgb(255, 60, 60) 99.62%, rgb(0, 188, 255) 101.23%)",
      }}
      data-node-id="3:9228"
    >
      <Image alt="" src="/images/solarDesignLogo.png" width={36} height={36} />
      <span
        className="text-center font-dm-sans text-[9.938px] font-semibold uppercase leading-[12.422px] text-white px-1.5"
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Solar Design
      </span>
    </button>
  );
}

function ShortcutRailUploadButton({ onPress }: { onPress: () => void }) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="flex h-[72.032px] w-full flex-col items-center justify-center rounded-[11.042px] border-[1.157px] border-warm-border px-[1.157px] pb-[9.892px] pt-[9.982px] transition-opacity hover:opacity-95"
      style={{
        backgroundImage:
          "linear-gradient(108.71390978018913deg, rgb(32, 148, 243) 0%, rgb(23, 207, 207) 100%)",
      }}
    >
      <div className="flex flex-col items-center gap-1">
        <span className="flex size-[35.32px] items-center justify-center rounded-[8.833px] border border-white">
          <svg
            className="size-[18px] text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
        </span>
        <span
          className="font-dm-sans text-[10px] font-bold uppercase leading-normal text-white"
          style={{ fontVariationSettings: "'opsz' 14" }}
        >
          Upload
        </span>
      </div>
    </button>
  );
}

export type InstallerShortcutRailProps = {
  onCustomersImported?: () => void;
  selectedCustomerId?: string | null;
  customers?: InstallerCustomerSummary[];
  onAppointmentCreated?: (appointment: InstallerAppointment) => void;
  onNoteCreated?: (note: InstallerNote) => void;
  onTaskCreated?: (task: InstallerTask) => void;
  onTagCreated?: (tag: InstallerTag) => void;
};

export const InstallerShortcutRail = memo(function InstallerShortcutRail({
  onCustomersImported,
  selectedCustomerId = null,
  customers = [],
  onAppointmentCreated,
  onNoteCreated,
  onTaskCreated,
  onTagCreated,
}: InstallerShortcutRailProps = {}) {
  const [solarDesignerModalOpen, setSolarDesignerModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [paymentsModalOpen, setPaymentsModalOpen] = useState(false);
  const [importSource, setImportSource] =
    useState<CustomerImportSource>("file");

  const openImportModal = (source: CustomerImportSource) => {
    setImportSource(source);
    setImportModalOpen(true);
  };

  const customerActionDisabled =
    !selectedCustomerId || selectedCustomerId.startsWith("fallback-");

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  return (
    <aside
      className="hidden shrink-0 flex-col border-l border-warm-border bg-cream-50 py-8 lg:flex"
      aria-label="Quick shortcuts"
      data-node-id="3:9234"
    >
      <SolarDesignerAutoFetchModal
        open={solarDesignerModalOpen}
        onClose={() => setSolarDesignerModalOpen(false)}
        customerName={
          selectedCustomer
            ? [selectedCustomer.firstName, selectedCustomer.lastName]
                .map((part) => part?.trim())
                .filter(Boolean)
                .join(" ") || null
            : null
        }
      />
      <InstallerCustomerImportModal
        open={importModalOpen}
        source={importSource}
        onClose={() => setImportModalOpen(false)}
        onImported={onCustomersImported}
      />
      <InstallerCreateAppointmentModal
        open={appointmentModalOpen}
        onClose={() => setAppointmentModalOpen(false)}
        defaultCustomerId={selectedCustomerId}
        customers={customers}
        onCreated={onAppointmentCreated}
      />
      <InstallerCreateNoteModal
        open={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        customerId={selectedCustomerId}
        onCreated={onNoteCreated}
      />
      <InstallerCreateTaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        customerId={selectedCustomerId}
        onCreated={onTaskCreated}
      />
      <InstallerCreateTagModal
        open={tagModalOpen}
        onClose={() => setTagModalOpen(false)}
        customerId={selectedCustomerId}
        onCreated={onTagCreated}
      />
      <InstallerPaymentsModal
        open={paymentsModalOpen}
        onClose={() => setPaymentsModalOpen(false)}
        customer={selectedCustomer}
      />
      <nav className="flex flex-col gap-[7px] px-2">
        <ShortcutRailSolarDesignButton
          onPress={() => setSolarDesignerModalOpen(true)}
        />
        <ShortcutRailCard
          chip={
            <ShortcutRailGradientChip>
              <Icon name="Calendar" />
            </ShortcutRailGradientChip>
          }
          label="Appointment"
          onClick={() => setAppointmentModalOpen(true)}
        />
        <ShortcutRailCard
          chip={
            <ShortcutRailGradientChip>
              <Icon name="Doc" />
            </ShortcutRailGradientChip>
          }
          label="Invoice"
        />
        <ShortcutRailCard
          chip={
            <ShortcutRailGradientChip>
              <Icon name="MessageSquare" />
            </ShortcutRailGradientChip>
          }
          label="Notes"
          onClick={() => setNoteModalOpen(true)}
          disabled={customerActionDisabled}
          title={customerActionDisabled ? "Select a customer first" : undefined}
        />
        <ShortcutRailCard
          chip={
            <ShortcutRailGradientChip>
              <IconCheckSquare />
            </ShortcutRailGradientChip>
          }
          label="Tasks"
          onClick={() => setTaskModalOpen(true)}
          disabled={customerActionDisabled}
          title={customerActionDisabled ? "Select a customer first" : undefined}
        />
        <ShortcutRailCard
          chip={
            <ShortcutRailGradientChip>
              <IconPanelTag />
            </ShortcutRailGradientChip>
          }
          label="Tags"
          onClick={() => setTagModalOpen(true)}
          disabled={customerActionDisabled}
          title={customerActionDisabled ? "Select a customer first" : undefined}
        />
        <ShortcutRailCard
          tall
          chip={
            <ShortcutRailGradientChip>
              <ShortcutIconFolder />
            </ShortcutRailGradientChip>
          }
          label={
            <>
              <span className="block">Site</span>
              <span className="block">Projects</span>
            </>
          }
        />
        <ShortcutRailCard
          chip={
            <ShortcutRailGradientChip>
              <ShortcutIconBook />
            </ShortcutRailGradientChip>
          }
          label="Datasheets"
        />
        <ShortcutRailCard
          chip={
            <ShortcutRailGradientChip>
              <ShortcutIconCreditCard />
            </ShortcutRailGradientChip>
          }
          label="Payments"
          onClick={() => setPaymentsModalOpen(true)}
          disabled={customerActionDisabled}
          title={customerActionDisabled ? "Select a customer first" : undefined}
        />
        <ShortcutRailCard
          chip={
            <ShortcutRailBrandChip bgClassName="bg-[#217346]">
              <ShortcutIconExcelMark className="size-[17.651px]" />
            </ShortcutRailBrandChip>
          }
          label="Excel"
          onClick={() => openImportModal("excel")}
        />
        <ShortcutRailCard
          tall
          chip={
            <ShortcutRailBrandChip bgClassName="bg-[#0f9d58]">
              <ShortcutIconSheetGrid className="size-[14px]" />
            </ShortcutRailBrandChip>
          }
          label={
            <>
              <span className="block">Google</span>
              <span className="block">Sheets</span>
            </>
          }
          onClick={() => openImportModal("sheets")}
        />
        <ShortcutRailCard
          chip={
            <ShortcutRailBrandChip bgClassName="bg-[#2b579a]">
              <ShortcutIconWordMark className="size-[15px]" />
            </ShortcutRailBrandChip>
          }
          label="Word"
          disabled
          title="Coming soon"
        />
        <ShortcutRailUploadButton onPress={() => openImportModal("file")} />
      </nav>
    </aside>
  );
});
