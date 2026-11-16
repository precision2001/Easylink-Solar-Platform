"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/Icons";

export type CustomerEditProfileFormState = {
  name: string;
  phone: string;
  address: string;
  email: string;
};

const inputClassName =
  "w-full rounded-lg border customer-cream-card-border bg-cream-50 px-3 py-2 font-dm-sans text-sm text-warm-ink outline-none focus:border-orange-amber disabled:cursor-not-allowed disabled:opacity-60";

const labelClassName =
  "mb-1.5 block font-dm-sans text-[10px] font-semibold uppercase tracking-[0.3px] text-warm-gray";

type Props = {
  open: boolean;
  initial: CustomerEditProfileFormState;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: Pick<CustomerEditProfileFormState, "name" | "phone" | "address">) => void;
};

export function CustomerEditProfileModal({
  open,
  initial,
  saving,
  error,
  onClose,
  onSubmit,
}: Props) {
  const titleId = useId();
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [address, setAddress] = useState(initial.address);

  useEffect(() => {
    if (!open) return;
    setName(initial.name);
    setPhone(initial.phone);
    setAddress(initial.address);
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
        className="customer-cream-card-bg customer-cream-card-border relative z-[1] w-full max-w-[480px] overflow-hidden rounded-[10px] border shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]"
      >
        <div className="flex items-center justify-between gap-3 border-b customer-cream-card-border px-5 py-4">
          <h2
            id={titleId}
            className="font-inter text-base font-bold leading-6 text-warm-ink"
          >
            Edit profile
          </h2>
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-full text-warm-gray hover:bg-cream-100 hover:text-warm-ink disabled:opacity-60"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            <Icon name="X" className="size-4" />
          </button>
        </div>

        <form
          className="space-y-4 px-5 py-5"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              name: name.trim(),
              phone: phone.trim(),
              address: address.trim(),
            });
          }}
        >
          <label className="block">
            <span className={labelClassName}>Full name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={saving}
              data-clarity-mask="true"
              className={inputClassName}
              placeholder="Your name"
            />
          </label>

          <label className="block">
            <span className={labelClassName}>Email</span>
            <input
              type="email"
              value={initial.email}
              readOnly
              disabled
              data-clarity-mask="true"
              className={`${inputClassName} read-only:cursor-default read-only:opacity-70`}
              aria-describedby={`${titleId}-email-note`}
            />
            <p
              id={`${titleId}-email-note`}
              className="mt-1 font-dm-sans text-[10px] leading-[15px] text-warm-gray"
            >
              Email cannot be changed here.
            </p>
          </label>

          <label className="block">
            <span className={labelClassName}>Phone</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={saving}
              data-clarity-mask="true"
              className={inputClassName}
              placeholder="Phone number"
            />
          </label>

          <label className="block">
            <span className={labelClassName}>Address</span>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={saving}
              data-clarity-mask="true"
              className={inputClassName}
              placeholder="Street address"
            />
          </label>

          {error ? (
            <p className="font-dm-sans text-[11px] leading-[16.5px] text-red-600">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              className="rounded-lg border customer-cream-card-border px-4 py-2 font-dm-sans text-xs font-semibold text-warm-ink hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-orange-amber px-4 py-2 font-dm-sans text-xs font-semibold text-white hover:bg-orange-amber/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
