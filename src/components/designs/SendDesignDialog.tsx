"use client";

import { useEffect, useState } from "react";
import { ChannelChoice, channelUsable } from "@/components/quotes/ChannelChoice";
import { useSmsStatus } from "@/hooks/useSmsStatus";
import { describeShare, sendDesignToCustomer, type DesignChannel, type DesignShareResult } from "@/lib/designs/send-to-customer";

/**
 * "Send design to customer": the design is already in their portal; this
 * sends them a one-time sign-in link to it by email, SMS or both. Used from
 * Quotes & Leads (operations) and the installer's Solar design card.
 */
export function SendDesignDialog({
  portal,
  designId,
  customerName,
  phone,
  email,
  onClose,
  onSent,
}: {
  portal: "admin" | "installers";
  designId: string;
  customerName: string;
  phone: string | null | undefined;
  email: string | null | undefined;
  onClose: () => void;
  onSent?: (r: DesignShareResult) => void;
}) {
  const sms = useSmsStatus(portal === "admin" ? "admin" : "installer");
  const [channel, setChannel] = useState<DesignChannel>("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DesignShareResult | null>(null);

  // Default to Both once SMS turns out to be usable for this customer.
  useEffect(() => {
    if (sms && channelUsable("both", sms, phone)) setChannel((c) => (c === "email" ? "both" : c));
  }, [sms, phone]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const r = await sendDesignToCustomer(portal, designId, channelUsable(channel, sms, phone) ? channel : "email");
      setResult(r);
      onSent?.(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the design.");
    } finally {
      setBusy(false);
    }
  }

  const outcome = describeShare(result);
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
        aria-labelledby="send-design-title"
        className="w-full max-w-[480px] rounded-[14px] border border-[#E3E8EF] bg-white text-[#0F172A] shadow-[0_20px_50px_rgba(11,26,46,0.25)]"
      >
        <div className="flex items-start gap-3 border-b border-[#E3E8EF] px-5 py-4">
          <div className="flex-grow">
            <h2 id="send-design-title" className="m-0 font-source-sans text-[20px] font-bold">
              Send design to {customerName}
            </h2>
            <p className="mt-0.5 mb-0 text-[13px] leading-[1.5] text-[#5B6B80]">
              It&rsquo;s already in their portal. This sends a sign-in link to view it{email ? ` (${email})` : ""}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="flex size-9 shrink-0 items-center justify-center rounded-[8px] text-[20px] leading-none text-[#475569] hover:bg-[#F1F5F9] focus-visible:outline-2 focus-visible:outline-[#2563EB] disabled:opacity-50"
          >
            ×
          </button>
        </div>
        <div className="flex flex-col gap-4 px-5 py-4">
          {result && outcome ? (
            <p
              role="status"
              className={`m-0 rounded-[10px] px-3.5 py-3 text-[14px] leading-[1.5] ${
                outcome.tone === "success" ? "bg-[#ECFDF5] text-[#065F46]" : outcome.tone === "warning" ? "bg-[#FFF7E6] text-[#7A4A00]" : "bg-[#EFF6FF] text-[#1E3A8A]"
              }`}
            >
              {outcome.text}
            </p>
          ) : (
            <ChannelChoice value={channel} onChange={setChannel} sms={sms} phone={phone} />
          )}
          {error ? <p className="m-0 text-[13px] font-semibold text-[#991B1B]">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            {result ? (
              <button type="button" onClick={onClose} className="h-10 rounded-[10px] bg-[#0B1A2E] px-4 text-[14px] font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]">
                Done
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={busy}
                  className="h-10 rounded-[10px] bg-[#F68A0A] px-4 text-[14px] font-bold text-[#0B1A2E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] disabled:opacity-60"
                >
                  {busy ? "Sending…" : "Send design"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  className="h-10 rounded-[10px] px-4 text-[14px] font-semibold text-[#334155] hover:bg-[#F1F5F9] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
