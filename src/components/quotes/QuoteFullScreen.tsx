"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { QUOTE_FOCUS } from "@/components/quotes/QuoteParts";

/**
 * A quote in edit mode, over the whole screen (whatever opened it: the Master
 * portal's quotes drawer or the installer's Quotes card). Escape or Close
 * leaves without saving; it never closes the drawer underneath.
 */
export function QuoteFullScreen({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const returnTo = document.activeElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Capture on window so Escape closes only this, not a drawer listening on document.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onCloseRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prev;
      if (returnTo instanceof HTMLElement) returnTo.focus();
    };
  }, []);

  // Only ever opened from a click, so the document is there.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[80] flex flex-col bg-[#F4F6FA]">
      <header className="flex shrink-0 items-center gap-3 border-b border-[#E3E8EF] bg-white px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[12px] font-bold uppercase tracking-[0.06em] text-[#F68A0A]">Edit quote</p>
          <h2 className="m-0 truncate font-source-sans text-[19px] font-bold text-[#0F172A]">{title}</h2>
          {subtitle ? <p className="m-0 truncate text-[13px] text-[#5B6B80]">{subtitle}</p> : null}
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={() => onCloseRef.current()}
          aria-label="Close without saving"
          title="Close without saving (Esc)"
          className={`flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-[#D5DCE5] bg-white text-[22px] leading-none text-[#334155] hover:border-[#64748B] ${QUOTE_FOCUS}`}
        >
          ×
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-5 sm:px-6 sm:py-6">
          <div className="rounded-[14px] border border-[#E3E8EF] bg-white p-4 sm:p-6">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
