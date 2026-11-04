"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  EMPTY_NEW_LEAD,
  NEW_LEAD_SOURCES,
  createAdminLead,
  newLeadPayload,
  validateNewLead,
  type NewLeadErrors,
  type NewLeadForm,
  type NewLeadSource,
} from "@/lib/admin/create-lead";

const FIELD =
  "h-10 w-full rounded-[8px] border border-[#CBD5E1] bg-white px-2.5 text-[14px] text-[#0F172A] focus-visible:outline-2 focus-visible:outline-[#2563EB]";
const LABEL = "flex flex-col gap-1 text-[12px] font-semibold text-[#475569]";
const ERROR = "m-0 text-[12px] font-semibold text-[#991B1B]";

/**
 * "New lead" on Quotes & Leads: a staff-entered lead (phone call, walk-in,
 * referral…). It lands in New lead with its first task due at the source's
 * response target, like any other lead.
 */
export function NewLeadDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<NewLeadForm>(EMPTY_NEW_LEAD);
  const [errors, setErrors] = useState<NewLeadErrors>({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // A fresh form each time it opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(EMPTY_NEW_LEAD);
      setErrors({});
      setSubmitError(null);
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    nameRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  const set = <K extends keyof NewLeadForm>(key: K, value: NewLeadForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const found = validateNewLead(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setSubmitError(null);
    try {
      await createAdminLead(newLeadPayload(form));
      onCreated();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not create the lead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(11,26,46,0.45)] px-4 py-10 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-lead-title"
        className="w-full max-w-[560px] rounded-[14px] border border-[#E3E8EF] bg-white text-[#0F172A] shadow-[0_20px_50px_rgba(11,26,46,0.25)]"
      >
        <div className="flex items-start gap-3 border-b border-[#E3E8EF] px-5 py-4">
          <div className="flex-grow">
            <h2 id="new-lead-title" className="m-0 font-source-sans text-[20px] font-bold">
              New lead
            </h2>
            <p className="mt-0.5 text-[13px] text-[#5B6B80]">
              Starts in New lead with a first-call task, due at the source&apos;s response target.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="flex size-9 shrink-0 items-center justify-center rounded-[8px] text-[#475569] hover:bg-[#F1F5F9] disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} noValidate className="flex flex-col gap-3.5 px-5 py-4">
          <label className={LABEL}>
            <span>
              Name <span className="text-[#991B1B]">*</span>
            </span>
            <input
              ref={nameRef}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              autoComplete="off"
              maxLength={200}
              aria-invalid={Boolean(errors.name)}
              className={FIELD}
            />
            {errors.name ? <span className={ERROR}>{errors.name}</span> : null}
          </label>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <label className={LABEL}>
              Mobile
              <input
                type="tel"
                inputMode="tel"
                value={form.mobile}
                onChange={(e) => set("mobile", e.target.value)}
                placeholder="04xx xxx xxx"
                autoComplete="off"
                aria-invalid={Boolean(errors.mobile)}
                className={FIELD}
              />
              {errors.mobile ? <span className={ERROR}>{errors.mobile}</span> : null}
            </label>
            <label className={LABEL}>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                autoComplete="off"
                aria-invalid={Boolean(errors.email)}
                className={FIELD}
              />
              {errors.email ? <span className={ERROR}>{errors.email}</span> : null}
            </label>
          </div>

          <label className={LABEL}>
            Address
            <input
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Street, suburb, state, postcode"
              autoComplete="off"
              className={FIELD}
            />
          </label>

          <label className={LABEL}>
            Source
            <select
              value={form.source}
              onChange={(e) => set("source", e.target.value as NewLeadSource)}
              className={FIELD}
            >
              {NEW_LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className={LABEL}>
            Notes
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full rounded-[8px] border border-[#CBD5E1] bg-white px-2.5 py-2 text-[14px] text-[#0F172A] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
            />
          </label>

          {submitError ? (
            <p role="alert" className="m-0 rounded-[8px] bg-[#FEE2E2] px-3 py-2 text-[13px] font-semibold text-[#991B1B]">
              {submitError}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 border-t border-[#EEF2F6] pt-3.5">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="h-10 rounded-[8px] border border-[#CBD5E1] bg-white px-4 text-[13px] font-semibold text-[#334155] hover:border-[#64748B] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="h-10 rounded-[8px] bg-[#0B1A2E] px-4 text-[13px] font-bold text-white hover:bg-[#1E2E45] disabled:opacity-60"
            >
              {busy ? "Creating…" : "Create lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
