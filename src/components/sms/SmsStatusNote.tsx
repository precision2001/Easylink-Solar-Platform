import { SMS_SANDBOX_NOTE, smsBlockedReason, type SmsStatus } from "@/lib/sms-status";

/**
 * One line under any SMS control: why SMS is off (sender ID pending, switched
 * off, no mobile), an amber note in test mode, or nothing when it's live.
 * Pass `phone` only where the control texts a specific person.
 */
export function SmsStatusNote({
  status,
  phone,
  checkPhone = false,
  id,
  className = "",
}: {
  status: SmsStatus | null;
  phone?: string | null;
  /** When true, a missing mobile also blocks SMS. */
  checkPhone?: boolean;
  id?: string;
  className?: string;
}) {
  const blocked = status
    ? checkPhone
      ? smsBlockedReason(status, phone)
      : status.state === "live" || status.state === "sandbox"
        ? null
        : status.message
    : null;
  if (!status) return null;
  if (blocked) {
    return (
      <p id={id} className={`m-0 text-[12.5px] leading-[1.45] text-[#5B6B80] ${className}`}>
        {blocked}
      </p>
    );
  }
  if (status.state === "sandbox") {
    return (
      <p id={id} className={`m-0 text-[12.5px] leading-[1.45] ${className}`}>
        <span className="inline-flex items-center rounded-[6px] bg-[#FEF3C7] px-1.5 py-0.5 font-semibold text-[#92400E]">{SMS_SANDBOX_NOTE}</span>
      </p>
    );
  }
  return null;
}
