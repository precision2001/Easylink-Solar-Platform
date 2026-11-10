"use client";

import { shareState, type LeadDesignShare } from "@/lib/designs/send-to-customer";

/**
 * Whether the customer has been sent their design, as one control:
 *
 *  - Not sent: amber "flag" half with a grounded paper plane and a live dot,
 *    joined to a navy "Send" half. The whole pill is the button.
 *  - Changed since sent: same shape in orange, "Resend".
 *  - Sent: a quiet green chip with the plane in flight, when and how; still a
 *    button (opens the send dialog to send again).
 *
 * The split pill reads as "status | action" at a glance, so a row that still
 * needs the customer told stands out from the rows that are done.
 */
export function DesignShareBadge({
  design,
  onSend,
  size = "md",
}: {
  design: Pick<LeadDesignShare, "sharedAt" | "sharedChannels" | "updatedAt">;
  onSend?: () => void;
  size?: "sm" | "md";
}) {
  const s = shareState(design);
  const h = size === "sm" ? "h-7 text-[11.5px]" : "h-8 text-[12.5px]";

  if (s.state === "sent") {
    const label = `Design sent to the customer ${s.when}${s.how ? ` by ${s.how}` : ""}`;
    return (
      <button
        type="button"
        onClick={onSend}
        disabled={!onSend}
        title={`${label}. Send again`}
        aria-label={`${label}. Send again`}
        className={`group inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#A7E3C4] bg-[#EEFBF3] pl-1 pr-2.5 font-semibold text-[#05603A] transition-colors hover:border-[#4CC38A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] disabled:cursor-default ${h}`}
      >
        <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-[#12B76A] text-white">
          <PlaneInFlight />
        </span>
        <span className="truncate">
          Sent {s.when}
          {s.how ? <span className="font-medium text-[#3B8F65]"> · {s.how}</span> : null}
        </span>
      </button>
    );
  }

  const changed = s.state === "changed";
  const status = changed ? "Changed" : "Not sent";
  const action = changed ? "Resend" : "Send";
  const label = changed
    ? `Design changed since it was sent to the customer ${s.when}. Resend it`
    : "Design not sent to the customer yet. Send it";
  return (
    <button
      type="button"
      onClick={onSend}
      disabled={!onSend}
      title={label}
      aria-label={label}
      className={`group inline-flex max-w-full items-stretch overflow-hidden rounded-full font-bold shadow-[0_1px_0_rgba(11,26,46,0.06)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] disabled:cursor-default ${h} ${
        changed ? "ring-1 ring-[#F68A0A]" : "ring-1 ring-[#E9B949]"
      }`}
    >
      <span className={`flex min-w-0 items-center gap-1.5 pl-1.5 pr-2.5 ${changed ? "bg-[#FFF1E0] text-[#8A3F00]" : "bg-[#FFF6D9] text-[#7A4A00]"}`}>
        <span className="relative flex size-[20px] shrink-0 items-center justify-center">
          <PlaneGrounded />
          <span className="absolute -right-0.5 -top-0.5 flex size-2">
            <span className={`absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping ${changed ? "bg-[#F68A0A]" : "bg-[#E8A100]"}`} />
            <span className={`relative inline-flex size-2 rounded-full ${changed ? "bg-[#F68A0A]" : "bg-[#E8A100]"}`} />
          </span>
        </span>
        <span className="truncate">{status}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 bg-[#0B1A2E] pl-2.5 pr-3 text-white transition-colors group-hover:bg-[#F68A0A] group-hover:text-[#0B1A2E]">
        {action}
        <ArrowGlyph />
      </span>
    </button>
  );
}

/** Paper plane sitting level, not yet sent. */
function PlaneGrounded() {
  return (
    <svg viewBox="0 0 20 20" className="size-[17px]" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 10.5 17 4.5l-3.2 11.2-4.3-3.6-3.3 2.6.5-4.2L2.5 10.5Z" />
      <path d="m6.9 10.5 6.9-4.4" strokeLinecap="round" />
      <path d="M2 17.5h16" strokeLinecap="round" strokeDasharray="1.5 2.2" />
    </svg>
  );
}

/** Paper plane in flight, sent. */
function PlaneInFlight() {
  return (
    <svg viewBox="0 0 20 20" className="size-[13px]" fill="currentColor" aria-hidden="true">
      <path d="M18.2 2.1 1.9 8.6c-.7.3-.7 1.3 0 1.5l4.5 1.6 1.6 5c.2.7 1.1.9 1.6.3l2.4-2.7 4 3c.6.4 1.4.1 1.5-.6l2.1-13.5c.1-.8-.6-1.4-1.4-1.1ZM8.1 11.4l7.1-5.6-5.8 6.6-.4 2.6-.9-3.6Z" />
    </svg>
  );
}

function ArrowGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="size-[12px] transition-transform motion-safe:group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" />
    </svg>
  );
}
