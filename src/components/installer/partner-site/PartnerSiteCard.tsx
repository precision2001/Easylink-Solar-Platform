"use client";

import { useEffect, useState } from "react";
import {
  partnerIframeSnippet,
  partnerLinkSnippet,
  partnerPageUrl,
} from "@/lib/installers/partner-embed";
import type { InstallerPartnerSite } from "@/lib/installers/partner-sites";

/**
 * One partner site, with the two things an installer actually came here for:
 * the address of their page, and the snippet to paste into their own website.
 *
 * The snippets are built against the origin this page is served from, so a
 * staging environment hands out staging URLs rather than production ones.
 *
 * "Powered by EasyLink Solar" is shown as a plain fact, not a toggle. It
 * follows the installer's plan, which EasyLink sets — offering a switch here
 * would imply the installer can turn it off themselves.
 */

const INK = "#0F172A";
const MUTED = "#5B6B80";
const SLATE = "#475569";
const BORDER = "#E3E8EF";
const BORDER_2 = "#CBD5E1";

type Snippet = "link" | "iframe";

export function PartnerSiteCard({
  site,
  onEdit,
  onToggleActive,
  busy,
}: {
  site: InstallerPartnerSite;
  onEdit: () => void;
  onToggleActive: () => void;
  busy: boolean;
}) {
  const [snippet, setSnippet] = useState<Snippet>("link");

  // The absolute origin is only knowable in the browser. On the server the
  // builders fall back to the production origin, which is also the right
  // answer in production — so the first paint is never wrong, just generic.
  // Read once on mount rather than every render: it cannot change without a
  // navigation, and reading `window` during render would differ from the
  // server's HTML.
  const [origin] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.location.origin,
  );

  const pageUrl = partnerPageUrl(site.key, origin);
  const code =
    snippet === "link"
      ? partnerLinkSnippet(site.key, "Design your solar system", origin)
      : partnerIframeSnippet(site.key, origin);

  return (
    <section
      aria-label={site.companyName}
      className="flex flex-col gap-3.5 rounded-2xl bg-white p-[18px]"
      style={{ border: `1px solid ${BORDER}`, color: INK }}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="grow">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 font-source-sans text-[20px] font-bold">
              {site.companyName}
            </h2>
            <Pill
              text={site.active ? "Live" : "Switched off"}
              bg={site.active ? "#DCFCE7" : "#E2E8F0"}
              fg={site.active ? "#166534" : "#334155"}
            />
            <Pill
              text={site.whiteLabel ? "White label" : "Powered by EasyLink"}
              bg="#DBEAFE"
              fg="#1E40AF"
              title={
                site.whiteLabel
                  ? "Your page carries no EasyLink branding"
                  : "Your page carries a small Powered by EasyLink Solar line. This follows your plan and is set by EasyLink."
              }
            />
          </div>
          <p className="mt-1 mb-0 text-[13px]" style={{ color: MUTED }}>
            {site.allowedOrigins.length === 1
              ? "1 website address allowed"
              : `${site.allowedOrigins.length} website addresses allowed`}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="flex h-10 items-center rounded-[10px] bg-white px-4 text-[13px] font-semibold"
            style={{ border: `1px solid ${BORDER_2}`, color: SLATE }}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onToggleActive}
            disabled={busy}
            className="flex h-10 items-center rounded-[10px] bg-white px-4 text-[13px] font-semibold disabled:opacity-60"
            style={{
              border: `1px solid ${BORDER_2}`,
              color: site.active ? "#991B1B" : "#166534",
            }}
          >
            {site.active ? "Switch off" : "Switch on"}
          </button>
        </div>
      </div>

      <Field label="Your page address">
        <CopyRow value={pageUrl} />
        <p className="m-0 text-[12px]" style={{ color: MUTED }}>
          Opens the full page. Link to it from your navigation, or embed it
          below.
        </p>
      </Field>

      <Field label="Allowed website addresses">
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {site.allowedOrigins.map((o) => (
            <li
              key={o}
              className="rounded-full px-2.5 py-1 font-mono text-[12px]"
              style={{ background: "#F1F5F9", color: SLATE }}
            >
              {o}
            </li>
          ))}
        </ul>
        <p className="m-0 text-[12px]" style={{ color: MUTED }}>
          The embed only renders on these. Add any other address your site is
          reached on from Edit.
        </p>
      </Field>

      <Field label="Add it to your website">
        <div
          role="group"
          aria-label="Snippet type"
          className="flex w-fit gap-1 rounded-[10px] p-1"
          style={{ border: `1px solid ${BORDER}` }}
        >
          {(
            [
              ["link", "Link or button"],
              ["iframe", "Section in a page"],
            ] as const
          ).map(([value, label]) => {
            const on = snippet === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={on}
                onClick={() => setSnippet(value)}
                className="h-9 rounded-lg px-3 text-[13px] font-semibold"
                style={{
                  background: on ? "#0B1A2E" : "transparent",
                  color: on ? "#FFFFFF" : SLATE,
                  border: "none",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <CopyRow value={code} multiline />

        <p className="m-0 text-[12px]" style={{ color: MUTED }}>
          {snippet === "link"
            ? "Works on every website builder. Paste it where you want the button, or just use the address above as a menu link."
            : "Paste into a custom HTML block. It will only load on the addresses listed above, so your designer cannot be embedded on someone else's site."}
        </p>
      </Field>

      {site.active ? null : (
        <p
          className="m-0 rounded-[10px] p-3 text-[13px]"
          style={{ background: "#FEF3C7", color: "#92400E" }}
        >
          This site is switched off, so the page and the embed will not load.
          Leads already captured through it are unaffected.
        </p>
      )}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span
        className="text-[11px] font-semibold tracking-[0.08em] uppercase"
        style={{ color: MUTED }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

/**
 * A read-only value with a copy button.
 *
 * The clipboard API needs a secure context and permission, so a failure is
 * normal rather than exceptional — the textarea stays selectable so the
 * installer can copy by hand, and the button says what happened.
 */
function CopyRow({
  value,
  multiline = false,
}: {
  value: string;
  multiline?: boolean;
}) {
  // The outcome is stored against the value it refers to, so switching
  // snippet types drops a stale "Copied" label without an effect to reset it:
  // a result for a different value simply is not this value's result.
  const [result, setResult] = useState<{
    of: string;
    state: "copied" | "failed";
  } | null>(null);
  const state = result?.of === value ? result.state : "idle";

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => setResult(null), 2200);
    return () => clearTimeout(t);
  }, [result]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setResult({ of: value, state: "copied" });
    } catch {
      setResult({ of: value, state: "failed" });
    }
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <textarea
        readOnly
        value={value}
        rows={multiline ? Math.min(7, value.split("\n").length) : 1}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full resize-none rounded-[10px] p-3 font-mono text-[12px] leading-[1.5] outline-none"
        style={{ border: `1px solid ${BORDER_2}`, background: "#F8FAFC", color: INK }}
        aria-label="Copy this"
      />
      <button
        type="button"
        onClick={copy}
        className="h-11 shrink-0 rounded-[10px] bg-white px-4 text-[13px] font-semibold"
        style={{ border: `1px solid ${BORDER_2}`, color: SLATE }}
      >
        {state === "copied"
          ? "Copied"
          : state === "failed"
            ? "Select and copy"
            : "Copy"}
      </button>
    </div>
  );
}

function Pill({
  text,
  bg,
  fg,
  title,
}: {
  text: string;
  bg: string;
  fg: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`rounded-full px-2.5 py-0.75 text-[11px] font-bold${title ? " cursor-help" : ""}`}
      style={{ background: bg, color: fg }}
    >
      {text}
    </span>
  );
}
