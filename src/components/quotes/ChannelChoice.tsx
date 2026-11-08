"use client";

import { useId } from "react";
import type { PaymentLinkChannel } from "@/lib/quotes";
import { SmsStatusNote } from "@/components/sms/SmsStatusNote";
import { smsBlockedReason, type SmsStatus } from "@/lib/sms-status";

const CHANNELS: { key: PaymentLinkChannel; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "sms", label: "SMS" },
  { key: "both", label: "Both" },
];

/** True when the chosen channel can't be used now and email should be used instead. */
export function channelUsable(channel: PaymentLinkChannel, sms: SmsStatus | null, phone: string | null | undefined): boolean {
  return channel === "email" || (sms !== null && smsBlockedReason(sms, phone) === null);
}

/**
 * Email / SMS / Both. SMS and Both switch off while texting isn't live (sender
 * ID pending, or off) or when there's no mobile on file, with the reason
 * underneath; test mode stays selectable with an amber note.
 */
export function ChannelChoice({
  value,
  onChange,
  sms,
  phone,
  label = "Send by",
}: {
  value: PaymentLinkChannel;
  onChange: (c: PaymentLinkChannel) => void;
  /** null while the SMS status is loading. */
  sms: SmsStatus | null;
  phone: string | null | undefined;
  label?: string;
}) {
  const uid = useId();
  const blocked = sms ? smsBlockedReason(sms, phone) : "Checking whether SMS is available…";
  return (
    <div className="flex flex-col gap-1.5">
      <div role="radiogroup" aria-label={label} aria-describedby={`${uid}-note`} className="flex w-fit gap-1 rounded-[10px] border border-[#E3E8EF] bg-white p-1">
        {CHANNELS.map((c) => {
          const disabled = c.key !== "email" && blocked !== null;
          const on = value === c.key;
          return (
            <label
              key={c.key}
              className={`flex min-h-[40px] items-center rounded-[8px] px-3.5 text-[13.5px] font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#2563EB] ${
                disabled ? "cursor-not-allowed text-[#A3AEBD]" : on ? "cursor-pointer bg-[#0B1A2E] text-white" : "cursor-pointer text-[#334155] hover:bg-[#F1F5F9]"
              }`}
            >
              <input type="radio" name={`${uid}-ch`} checked={on} disabled={disabled} onChange={() => onChange(c.key)} className="sr-only" />
              {c.label}
            </label>
          );
        })}
      </div>
      {sms ? (
        <SmsStatusNote id={`${uid}-note`} status={sms} phone={phone} checkPhone />
      ) : (
        <p id={`${uid}-note`} className="m-0 text-[12.5px] text-[#5B6B80]">
          Checking whether SMS is available…
        </p>
      )}
    </div>
  );
}
