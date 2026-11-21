"use client";

import { useState } from "react";
import type { InstallerPartnerSite } from "@/lib/installers/partner-sites";

/**
 * The create/edit form for one partner site.
 *
 * Two things here are deliberate rather than incidental:
 *
 * - `key` is editable only while creating. It is in the public URL the
 *   installer has already put on their website, so changing it would break
 *   every live embed; on an existing site it is shown read-only instead.
 * - the website list is a textarea, one per line. The backend normalises each
 *   entry to a bare origin and sends back what it stored, so the field is
 *   re-seeded from the saved record after every save rather than keeping the
 *   installer's typing — otherwise the box would disagree with the allowlist
 *   that actually decides whether their embed renders.
 */

const INK = "#0F172A";
const MUTED = "#5B6B80";
const SLATE = "#475569";
const BORDER = "#E3E8EF";
const BORDER_2 = "#CBD5E1";
const SUN = "#F68A0A";
const SUN_INK = "#3B1D00";

const LABEL = "flex flex-col gap-1.5 text-[13px] font-semibold";
const INPUT =
  "h-11 rounded-[10px] bg-white px-3 text-[14px] font-normal outline-none focus:border-[#F68A0A]";
const HINT = "text-[12px] font-normal";

export type PartnerSiteDraft = {
  key: string;
  companyName: string;
  websiteUrl: string;
  origins: string;
  brandPrimary: string;
  brandOnPrimary: string;
  brandAccent: string;
  logoUrl: string;
};

export function draftFromSite(site: InstallerPartnerSite): PartnerSiteDraft {
  return {
    key: site.key,
    companyName: site.companyName,
    websiteUrl: site.websiteUrl ?? "",
    origins: site.allowedOrigins.join("\n"),
    brandPrimary: site.brandPrimary,
    brandOnPrimary: site.brandOnPrimary,
    brandAccent: site.brandAccent ?? "",
    logoUrl: site.logoUrl ?? "",
  };
}

export const EMPTY_DRAFT: PartnerSiteDraft = {
  key: "",
  companyName: "",
  websiteUrl: "",
  origins: "",
  brandPrimary: "#F68A0A",
  brandOnPrimary: "#3B1D00",
  brandAccent: "",
  logoUrl: "",
};

/** One per line, blanks dropped — the backend validates and normalises each. */
export function parseOrigins(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function PartnerSiteForm({
  draft,
  onChange,
  onSubmit,
  onCancel,
  mode,
  busy,
  error,
}: {
  draft: PartnerSiteDraft;
  onChange: (next: PartnerSiteDraft) => void;
  onSubmit: () => void;
  onCancel: () => void;
  mode: "create" | "edit";
  busy: boolean;
  error: string | null;
}) {
  const set = <K extends keyof PartnerSiteDraft>(
    field: K,
    value: PartnerSiteDraft[K],
  ) => onChange({ ...draft, [field]: value });

  const originCount = parseOrigins(draft.origins).length;
  const canSave =
    draft.companyName.trim().length > 0 &&
    originCount > 0 &&
    (mode === "edit" || draft.key.trim().length >= 3);

  return (
    <form
      className="flex flex-col gap-4 rounded-2xl bg-white p-[18px]"
      style={{ border: `1px solid ${BORDER}`, color: INK }}
      onSubmit={(e) => {
        e.preventDefault();
        if (canSave && !busy) onSubmit();
      }}
    >
      <h2 className="m-0 font-source-sans text-[20px] font-bold">
        {mode === "create" ? "New partner site" : `Edit ${draft.companyName}`}
      </h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className={LABEL}>
          Your company name
          <input
            className={INPUT}
            style={{ border: `1px solid ${BORDER_2}` }}
            value={draft.companyName}
            onChange={(e) => set("companyName", e.target.value)}
            maxLength={120}
            required
          />
          <span className={HINT} style={{ color: MUTED }}>
            Shown on the page, and in the line telling visitors their design
            goes to you.
          </span>
        </label>

        <label className={LABEL}>
          Link name
          {mode === "create" ? (
            <>
              <input
                className={INPUT}
                style={{ border: `1px solid ${BORDER_2}` }}
                value={draft.key}
                onChange={(e) => set("key", e.target.value)}
                placeholder="solarman"
                minLength={3}
                maxLength={40}
                required
              />
              <span className={HINT} style={{ color: MUTED }}>
                Lowercase letters, numbers and hyphens. This becomes part of
                your page address and cannot be changed later.
              </span>
            </>
          ) : (
            <>
              <input
                className={INPUT}
                style={{ border: `1px solid ${BORDER}`, background: "#F1F5F9" }}
                value={draft.key}
                readOnly
                aria-describedby="partner-key-fixed"
              />
              <span id="partner-key-fixed" className={HINT} style={{ color: MUTED }}>
                Fixed — your website already links to this address. Create a
                second site if you need a different one.
              </span>
            </>
          )}
        </label>
      </div>

      <label className={LABEL}>
        Your website addresses
        <textarea
          className="min-h-[92px] rounded-[10px] bg-white p-3 text-[14px] font-normal outline-none focus:border-[#F68A0A]"
          style={{ border: `1px solid ${BORDER_2}` }}
          value={draft.origins}
          onChange={(e) => set("origins", e.target.value)}
          placeholder={"solarmanaustralia.com.au\nwww.solarmanaustralia.com.au"}
          required
        />
        <span className={HINT} style={{ color: MUTED }}>
          One per line. Only these sites may show your designer, so add every
          address people reach your site on — <strong>www and the bare domain
          count as two</strong>. We store them as plain web addresses, so what
          you see after saving may be tidied up.
        </span>
      </label>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className={LABEL}>
          Your website (optional)
          <input
            className={INPUT}
            style={{ border: `1px solid ${BORDER_2}` }}
            value={draft.websiteUrl}
            onChange={(e) => set("websiteUrl", e.target.value)}
            placeholder="https://solarmanaustralia.com.au"
            type="url"
          />
        </label>

        <label className={LABEL}>
          Logo address (optional)
          <input
            className={INPUT}
            style={{ border: `1px solid ${BORDER_2}` }}
            value={draft.logoUrl}
            onChange={(e) => set("logoUrl", e.target.value)}
            placeholder="https://solarmanaustralia.com.au/logo.png"
            type="url"
          />
          <span className={HINT} style={{ color: MUTED }}>
            Must start with https.
          </span>
        </label>
      </div>

      <fieldset
        className="m-0 flex flex-col gap-3 rounded-[12px] p-3.5"
        style={{ border: `1px solid ${BORDER}` }}
      >
        <legend className="px-1 text-[13px] font-semibold">Your colours</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ColourField
            label="Buttons"
            value={draft.brandPrimary}
            onChange={(v) => set("brandPrimary", v)}
          />
          <ColourField
            label="Text on buttons"
            value={draft.brandOnPrimary}
            onChange={(v) => set("brandOnPrimary", v)}
          />
          <ColourField
            label="Accent (optional)"
            value={draft.brandAccent}
            onChange={(v) => set("brandAccent", v)}
            allowEmpty
          />
        </div>
        <p className="m-0 text-[12px]" style={{ color: MUTED }}>
          Hex colours such as #1E88E5. Pick the ones your own site already uses
          so the page looks like part of it.
        </p>
      </fieldset>

      {error ? (
        <p
          role="alert"
          className="m-0 rounded-[10px] p-3 text-[13px]"
          style={{ background: "#FEF2F2", color: "#991B1B" }}
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2.5">
        <button
          type="submit"
          disabled={!canSave || busy}
          className="flex h-11 items-center rounded-[10px] border-none px-5 text-[14px] font-bold disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: SUN, color: SUN_INK }}
        >
          {busy
            ? "Saving…"
            : mode === "create"
              ? "Create partner site"
              : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex h-11 items-center rounded-[10px] bg-white px-5 text-[14px] font-semibold"
          style={{ border: `1px solid ${BORDER_2}`, color: SLATE }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/**
 * A colour picker beside a text box, both editing the same value.
 *
 * The native picker cannot represent "no colour", so the optional accent
 * keeps a text box that can be cleared, and the picker falls back to a
 * default swatch while it is empty.
 */
function ColourField({
  label,
  value,
  onChange,
  allowEmpty = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allowEmpty?: boolean;
}) {
  const [picker, setPicker] = useState(value || "#F68A0A");
  const valid = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
  const ok = valid || (allowEmpty && !value.trim());

  return (
    <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
      {label}
      <span className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} colour picker`}
          className="size-11 shrink-0 cursor-pointer rounded-[10px] bg-white p-1"
          style={{ border: `1px solid ${BORDER_2}` }}
          value={valid ? value.trim() : picker}
          onChange={(e) => {
            setPicker(e.target.value);
            onChange(e.target.value);
          }}
        />
        <input
          className="h-11 w-full rounded-[10px] bg-white px-3 font-mono text-[13px] font-normal outline-none focus:border-[#F68A0A]"
          style={{ border: `1px solid ${ok ? BORDER_2 : "#F87171"}` }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={allowEmpty ? "none" : "#F68A0A"}
          maxLength={7}
        />
      </span>
    </label>
  );
}
