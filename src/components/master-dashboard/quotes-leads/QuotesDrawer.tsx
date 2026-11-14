"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/master-dashboard/quotes-leads/icons";
import { StaffQuotesPanel } from "@/components/quotes/StaffQuotesPanel";
import type { PipelineLead } from "@/lib/admin/leads-pipeline";

/**
 * A lead's quote versions in a panel from the right. Full screen on a phone.
 * Opened from the row's ⋯ menu, either on the list ("Quotes") or straight on
 * the new-quote form ("New quote").
 */
export function QuotesDrawer({
  lead,
  startWith,
  openId,
  onClose,
  onChanged,
}: {
  lead: PipelineLead;
  startWith: "list" | "create";
  /** A quote to open on arrival. */
  openId?: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<Element | null>(null);

  useEffect(() => {
    returnTo.current = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      if (returnTo.current instanceof HTMLElement) returnTo.current.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-labelledby="quotes-drawer-title">
      <button type="button" aria-label="Close quotes" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-[#0B1A2E]/55 backdrop-blur-[1px]" />
      <aside className="relative flex h-full w-full flex-col bg-[#F8FAFC] shadow-[-16px_0_48px_rgba(11,26,46,0.25)] sm:w-[600px] sm:max-w-[calc(100vw-48px)] sm:rounded-l-[14px]">
        <header className="flex items-start gap-3 border-b border-[#E3E8EF] bg-white px-5 py-4 sm:rounded-tl-[14px]">
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[12px] font-bold uppercase tracking-[0.06em] text-[#F68A0A]">Quotes</p>
            <h2 id="quotes-drawer-title" className="m-0 truncate font-source-sans text-[20px] font-bold text-[#0F172A]">
              {lead.customerName}
            </h2>
            <p className="m-0 truncate text-[13px] text-[#5B6B80]">{lead.address ?? lead.customerEmail ?? "No address on the lead"}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-[#D5DCE5] bg-white text-[#334155] hover:border-[#64748B] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2563EB]"
          >
            <Icon name="x" size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <StaffQuotesPanel portal="admin" leadId={lead.id} customerName={lead.customerName} customerPhone={lead.customerPhone} startWith={startWith} initialOpenId={openId} onChanged={onChanged} />
        </div>
      </aside>
    </div>
  );
}
