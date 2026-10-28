"use client";

import classNames from "classnames";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import Icon from "@/components/ui/Icons";
import { useInstallerConfirm } from "@/components/installer/home-dashboard/InstallerConfirmDialog";
import {
  deleteInstallerCustomerDocument,
  formatDocumentSize,
  uploadInstallerCustomerDocument,
  type InstallerCustomerDocument,
} from "@/lib/installers/customer-documents";
import { AiLabelChip, AiRecordPanel, useAiFileLabels } from "@/components/ai/AiRecordPanel";
import {
  INSTALLER_CUSTOMER_TYPES,
  updateInstallerCustomerHomeProfile,
  type InstallerCustomerSummary,
  type InstallerCustomerType,
} from "@/lib/installers/customers";
import type { InstallerCustomerDesign } from "@/lib/installers/designs";

function IconBuilding({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path d="M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18M6 22h15M10 10h4M10 14h4M10 6h4" />
    </svg>
  );
}

function ProfileUploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  );
}

function ProfileDetailField({
  icon,
  label,
  value,
  className,
  mask,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
  /** Set for fields carrying customer PII (phone/email) — hides the value from Clarity session recordings. */
  mask?: boolean;
}) {
  return (
    <div
      className={classNames(
        "flex min-h-[36.44px] items-center gap-[8.825px]",
        className,
      )}
    >
      <span className="mt-0.5 shrink-0 text-warm-black [&_svg]:size-[17.651px]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-dm-sans text-[11.042px] font-normal uppercase leading-[16.56px] tracking-[0.552px] text-warm-black/60">
          {label}
        </p>
        <p
          className="font-dm-sans text-[13.25px] font-semibold leading-[19.875px] text-warm-black"
          {...(mask ? { "data-clarity-mask": "true" } : {})}
        >
          {value}
        </p>
      </div>
    </div>
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

function customerName(customer?: InstallerCustomerSummary | null) {
  const fullName =
    `${customer?.firstName ?? ""} ${customer?.lastName ?? ""}`.trim();
  return fullName || customer?.email || "Selected Customer";
}

function designProductsTotal(design?: InstallerCustomerDesign | null) {
  return (
    design?.products?.reduce((total, item) => total + (item.totalPrice ?? 0), 0) ??
    0
  );
}

function defaultSalePrice(design?: InstallerCustomerDesign | null) {
  if (design?.estimatedSavings) return design.estimatedSavings * 8;
  return designProductsTotal(design);
}

function defaultProfit(
  design: InstallerCustomerDesign | null,
  salePrice: number,
) {
  const equipmentCost = designProductsTotal(design);
  return Math.max(0, salePrice - equipmentCost);
}

function buildProfileDisplay(
  customer: InstallerCustomerSummary | null,
  design: InstallerCustomerDesign | null,
) {
  const computedSale = defaultSalePrice(design);
  const homeProfile = customer?.homeProfile;
  const salePrice = homeProfile?.salePrice ?? computedSale;
  const profit =
    homeProfile?.profit ?? defaultProfit(design, salePrice);

  return {
    name: customerName(customer),
    ref: customer?.id ? `REF #${customer.id.slice(0, 8).toUpperCase()}` : "-",
    phone: customer?.phone || "-",
    email: customer?.email || "-",
    type: homeProfile?.customerType ?? "Individual",
    salePrice: formatCurrency(salePrice),
    profit: formatCurrency(profit),
  };
}

type ProfileFormState = {
  name: string;
  phone: string;
  email: string;
  customerType: InstallerCustomerType;
  salePrice: string;
  profit: string;
};

function profileFormInitial(
  customer: InstallerCustomerSummary | null,
  design: InstallerCustomerDesign | null,
): ProfileFormState {
  const computedSale = defaultSalePrice(design);
  const homeProfile = customer?.homeProfile;
  const salePrice = homeProfile?.salePrice ?? computedSale;
  const profit = homeProfile?.profit ?? defaultProfit(design, salePrice);

  return {
    name: customerName(customer),
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    customerType: homeProfile?.customerType ?? "Individual",
    salePrice: String(Math.round(salePrice)),
    profit: String(Math.round(profit)),
  };
}

function splitName(name: string): { firstName: string; lastName: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { firstName: "Customer", lastName: "Customer" };
  }
  const space = trimmed.indexOf(" ");
  if (space === -1) {
    return { firstName: trimmed, lastName: trimmed };
  }
  const firstName = trimmed.slice(0, space).trim();
  const lastName = trimmed.slice(space + 1).trim();
  return {
    firstName: firstName || trimmed,
    lastName: lastName || firstName || trimmed,
  };
}

function parseAmount(value: string) {
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function ProfileEditModal({
  open,
  initial,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial: ProfileFormState;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: ProfileFormState) => void;
}) {
  const titleId = useId();
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [email, setEmail] = useState(initial.email);
  const [customerType, setCustomerType] = useState(initial.customerType);
  const [salePrice, setSalePrice] = useState(initial.salePrice);
  const [profit, setProfit] = useState(initial.profit);

  useEffect(() => {
    if (!open) return;
    setName(initial.name);
    setPhone(initial.phone);
    setEmail(initial.email);
    setCustomerType(initial.customerType);
    setSalePrice(initial.salePrice);
    setProfit(initial.profit);
  }, [initial, open]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, open, saving]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-[rgba(47,47,47,0.67)] backdrop-blur-[1px]"
        onClick={() => {
          if (!saving) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[1] w-full max-w-[520px] overflow-hidden rounded-[12px] border border-warm-border bg-white shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]"
      >
        <div className="border-b border-warm-border bg-linear-to-b from-yellow-lemon to-orange-amber px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <h2
              id={titleId}
              className="font-inter text-[14px] font-bold leading-[21px] text-warm-black"
            >
              Edit customer profile
            </h2>
            <button
              type="button"
              className="flex size-6 items-center justify-center rounded-full bg-[rgba(28,26,23,0.1)] text-warm-black hover:bg-[rgba(28,26,23,0.18)]"
              onClick={onClose}
              disabled={saving}
              aria-label="Close"
            >
              <Icon name="X" className="size-[14px]" />
            </button>
          </div>
        </div>

        <form
          className="space-y-4 px-4 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              name: name.trim(),
              phone: phone.trim(),
              email: email.trim(),
              customerType,
              salePrice: salePrice.trim(),
              profit: profit.trim(),
            });
          }}
        >
          <label className="block">
            <span className="mb-1.5 block font-dm-sans text-xs font-semibold uppercase tracking-wide text-warm-gray">
              Name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={saving}
              data-clarity-mask="true"
              className="w-full rounded-lg border border-warm-border bg-cream-50 px-3 py-2 font-dm-sans text-sm text-warm-ink outline-none focus:border-brand-blue"
              placeholder="Full name"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block font-dm-sans text-xs font-semibold uppercase tracking-wide text-warm-gray">
                Phone
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={saving}
                data-clarity-mask="true"
                className="w-full rounded-lg border border-warm-border bg-cream-50 px-3 py-2 font-dm-sans text-sm text-warm-ink outline-none focus:border-brand-blue"
                placeholder="Phone number"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block font-dm-sans text-xs font-semibold uppercase tracking-wide text-warm-gray">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={saving}
                data-clarity-mask="true"
                className="w-full rounded-lg border border-warm-border bg-cream-50 px-3 py-2 font-dm-sans text-sm text-warm-ink outline-none focus:border-brand-blue"
                placeholder="Email address"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block font-dm-sans text-xs font-semibold uppercase tracking-wide text-warm-gray">
              Type
            </span>
            <select
              value={customerType}
              onChange={(e) =>
                setCustomerType(e.target.value as InstallerCustomerType)
              }
              disabled={saving}
              className="w-full rounded-lg border border-warm-border bg-cream-50 px-3 py-2 font-dm-sans text-sm text-warm-ink outline-none focus:border-brand-blue"
            >
              {INSTALLER_CUSTOMER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block font-dm-sans text-xs font-semibold uppercase tracking-wide text-warm-gray">
                Sale price
              </span>
              <input
                type="number"
                min={0}
                step={1}
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                required
                disabled={saving}
                className="w-full rounded-lg border border-warm-border bg-cream-50 px-3 py-2 font-dm-sans text-sm text-warm-ink outline-none focus:border-brand-blue"
                placeholder="0"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block font-dm-sans text-xs font-semibold uppercase tracking-wide text-warm-gray">
                Profit
              </span>
              <input
                type="number"
                min={0}
                step={1}
                value={profit}
                onChange={(e) => setProfit(e.target.value)}
                required
                disabled={saving}
                className="w-full rounded-lg border border-warm-border bg-cream-50 px-3 py-2 font-dm-sans text-sm text-warm-ink outline-none focus:border-brand-blue"
                placeholder="0"
              />
            </label>
          </div>

          {error ? (
            <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 font-dm-sans text-sm text-danger">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              className="inline-flex h-9 items-center rounded-lg border border-warm-border bg-white px-4 font-dm-sans text-sm font-semibold text-warm-ink hover:bg-cream-50"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-9 items-center rounded-lg bg-linear-to-br from-brand-blue to-brand-teal px-4 font-dm-sans text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

type Props = {
  customerId: string | null;
  customer: InstallerCustomerSummary | null;
  design: InstallerCustomerDesign | null;
  /** Sourced from the shell's single installer-home-panel fetch — not refetched here. */
  documents: InstallerCustomerDocument[];
  documentsLoading: boolean;
  documentsError: string | null;
  onCustomerUpdated: (customer: InstallerCustomerSummary) => void;
  onDocumentUploaded: (document: InstallerCustomerDocument) => void;
  onDocumentDeleted: (id: string) => void;
};

export function InstallerHomeCustomerProfileStrip({
  customerId,
  customer,
  design,
  documents,
  documentsLoading,
  documentsError,
  onCustomerUpdated,
  onDocumentUploaded,
  onDocumentDeleted,
}: Props) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { confirm, confirmDialog } = useInstallerConfirm();

  const selectedCustomerId =
    customerId && !customerId.startsWith("fallback-") ? customerId : null;

  // AI labels for each file (meter, switchboard…), set at upload: no checkboxes.
  const aiRecord = useMemo(
    () => (selectedCustomerId ? { type: "customer", id: selectedCustomerId } : null),
    [selectedCustomerId],
  );
  const aiLabels = useAiFileLabels("installer", aiRecord, documents.length);

  const profile = useMemo(
    () => buildProfileDisplay(customer, design),
    [customer, design],
  );

  const formInitial = useMemo(
    () => profileFormInitial(customer, design),
    [customer, design],
  );

  async function handleSave(values: ProfileFormState) {
    if (!customerId) return;

    const saleAmount = parseAmount(values.salePrice);
    const profitAmount = parseAmount(values.profit);

    if (!Number.isFinite(saleAmount) || saleAmount < 0) {
      setSaveError("Enter a valid sale price.");
      return;
    }
    if (!Number.isFinite(profitAmount) || profitAmount < 0) {
      setSaveError("Enter a valid profit amount.");
      return;
    }

    const { firstName, lastName } = splitName(values.name);

    setSaving(true);
    setSaveError(null);

    try {
      const updated = await updateInstallerCustomerHomeProfile(customerId, {
        firstName,
        lastName,
        phone: values.phone || undefined,
        email: values.email,
        customerType: values.customerType,
        salePrice: saleAmount,
        profit: profitAmount,
      });
      onCustomerUpdated(updated);
      setEditOpen(false);
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "Failed to update customer profile",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selectedCustomerId) return;

    setUploading(true);
    setUploadError(null);
    try {
      const doc = await uploadInstallerCustomerDocument(selectedCustomerId, file);
      onDocumentUploaded(doc);
      toast.success(`"${doc.fileName}" uploaded successfully.`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to upload document";
      setUploadError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteDocument(doc: InstallerCustomerDocument) {
    const confirmed = await confirm({
      title: "Delete document",
      description: `Delete "${doc.fileName}"?`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!confirmed) return;

    setDeletingId(doc.id);
    setUploadError(null);
    try {
      await deleteInstallerCustomerDocument(doc.id);
      onDocumentDeleted(doc.id);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to delete document",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <section
        className="mt-6 overflow-hidden rounded-[11px] bg-linear-to-b from-yellow-lemon to-orange-amber px-[17px] py-[20px] md:px-[21px]"
        data-node-id="3:8907"
      >
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-[26.5px]">
          <div className="flex shrink-0 items-start gap-[16.5px]">
            <div className="flex size-[52.99px] shrink-0 items-center justify-center rounded-full bg-warm-black/20">
              <Icon
                name="User"
                className="size-[26.49px] text-warm-black"
              />
            </div>
            <div className="min-w-0 pt-[2px]">
              <h2
                className="font-inter text-[19.875px] font-bold leading-[29.81px] text-warm-black"
                data-clarity-mask="true"
              >
                {profile.name}
              </h2>
              <p className="font-dm-sans text-[13.25px] font-medium leading-[19.875px] text-warm-black/70">
                {profile.ref}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-[26.5px] gap-y-5">
            <ProfileDetailField
              icon={<Icon name="Phone" className="text-warm-black" />}
              label="Phone"
              value={profile.phone}
              mask
            />
            <ProfileDetailField
              icon={<Icon name="Mail" className="text-warm-black" />}
              label="Email"
              value={profile.email}
              className="min-w-0 max-w-[min(100%,280px)]"
              mask
            />
            <ProfileDetailField
              icon={<IconBuilding className="text-warm-black" />}
              label="Type"
              value={profile.type}
            />
            <ProfileDetailField
              icon={<Icon name="Dollar" className="text-warm-black" />}
              label="Sale Price"
              value={profile.salePrice}
            />
            <ProfileDetailField
              icon={<Icon name="Dollar" className="text-warm-black" />}
              label="Profit"
              value={profile.profit}
            />
          </div>

          <div className="flex shrink-0 items-center gap-[9.89px]">
            <button
              type="button"
              className="inline-flex h-[30.907px] items-center gap-2 rounded-[8.833px] bg-warm-black/15 pl-[13.24px] pr-[14px] font-dm-sans text-[13.25px] font-semibold leading-[19.875px] text-warm-black hover:bg-warm-black/25 disabled:opacity-50"
              onClick={() => {
                setSaveError(null);
                setEditOpen(true);
              }}
              disabled={!customerId}
            >
              <Icon name="Pencil" className="size-[15.445px]" />
              Edit
            </button>
            <button
              type="button"
              className="inline-flex h-[30.907px] items-center gap-2 rounded-[8.833px] bg-linear-to-br from-brand-blue to-brand-teal pl-[13.24px] pr-[16px] font-dm-sans text-[13.25px] font-semibold leading-[19.875px] text-white hover:opacity-95 disabled:opacity-60"
              disabled={!selectedCustomerId || uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <ProfileUploadIcon className="size-[15.445px] shrink-0 text-white" />
              {uploading ? "Uploading…" : "Upload"}
            </button>
            <input
              ref={fileInputRef}
              id={fileInputId}
              type="file"
              className="sr-only"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,image/*"
              disabled={!selectedCustomerId || uploading}
              onChange={(e) => void handleFileSelected(e)}
            />
          </div>
        </div>

        {(uploadError || documentsError || documentsLoading || documents.length > 0) && (
          <div className="mt-4 border-t border-warm-black/15 pt-3">
            {uploadError ? (
              <p className="mb-2 font-dm-sans text-xs text-red-800">{uploadError}</p>
            ) : null}
            {documentsError ? (
              <p className="font-dm-sans text-xs text-red-800">{documentsError}</p>
            ) : documentsLoading ? (
              <p className="font-dm-sans text-xs text-warm-black/70">
                Loading documents…
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-warm-black/10 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate font-dm-sans text-sm font-semibold text-warm-black hover:underline"
                        title={doc.fileName}
                      >
                        {doc.fileName}
                      </a>
                      <p className="font-dm-sans text-[11px] text-warm-black/60">
                        {formatDocumentSize(doc.sizeBytes)}
                        <AiLabelChip label={aiLabels.get(doc.id)} />
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-warm-black/70 hover:bg-warm-black/10 disabled:opacity-50"
                      aria-label={`Delete ${doc.fileName}`}
                      disabled={deletingId === doc.id}
                      onClick={() => void handleDeleteDocument(doc)}
                    >
                      <Icon name="Trash" className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {selectedCustomerId ? (
          <div className="mt-4">
            <AiRecordPanel key={`${selectedCustomerId}:${documents.length}`} record={{ type: "customer", id: selectedCustomerId }} portal="installer" />
          </div>
        ) : null}
      </section>

      <ProfileEditModal
        open={editOpen}
        initial={formInitial}
        saving={saving}
        error={saveError}
        onClose={() => {
          if (!saving) setEditOpen(false);
        }}
        onSubmit={handleSave}
      />

      {confirmDialog}
    </>
  );
}
