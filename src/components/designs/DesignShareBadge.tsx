"use client";

import {
  shareState,
  type LeadDesignShare,
} from "@/lib/designs/send-to-customer";

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
  // Same box as the Solar Design button beside it: 32 px high, 8 px corners.
  const box =
    size === "sm"
      ? "h-8 rounded-[8px] text-[10.5px]"
      : "h-9 rounded-[9px] text-[12px]";

  if (s.state === "sent") {
    const label = `Design sent to the customer ${s.when}${s.how ? ` by ${s.how}` : ""}`;
    return (
      <button
        type="button"
        onClick={onSend}
        disabled={!onSend}
        title={`${label}. Send again`}
        aria-label={`${label}. Send again`}
        className={`group inline-flex w-full min-w-0 items-center gap-1 border border-[#A7E3C4] bg-[#EEFBF3] pl-1 pr-2.5 font-semibold text-[#05603A] transition-colors hover:border-[#4CC38A] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2563EB] disabled:cursor-default ${box}`}
      >
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#12B76A] text-white">
          <PlaneInFlight />
        </span>
        <span className="truncate">
          Sent {s.when}
          {s.how && size !== "sm" ? (
            <span className="font-medium text-[#3B8F65]"> · {s.how}</span>
          ) : null}
        </span>
      </button>
    );
  }

  const changed = s.state === "changed";
  const status = changed ? "Edited" : "Not sent";
  const action = changed ? "Resend" : "Send";
  const label = changed
    ? `Design changed since it was sent to the customer ${s.when}. Resend it`
    : "Design not sent to the customer yet. Send it";
  // Two-step yellow: lemon into amber, as on the signed-in pill.
  return (
    <button
      type="button"
      onClick={onSend}
      disabled={!onSend}
      title={label}
      aria-label={label}
      className={`group inline-flex w-full min-w-0 items-center justify-between gap-1 bg-linear-to-r from-yellow-lemon to-orange-amber pl-1 pr-1.5 font-bold text-warm-black shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-[filter] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2563EB] disabled:cursor-default ${box}`}
    >
      <span className="flex min-w-0 items-center gap-1">
        <span className="relative flex size-5 shrink-0 items-center justify-center rounded-full bg-[rgba(255,255,255,0.55)]">
          <PlaneGrounded />
          <span className="absolute -right-0.5 -top-0.5 flex size-2">
            <span
              className={`absolute inline-flex size-full rounded-full opacity-70 motion-safe:animate-ping ${changed ? "bg-[#C2410C]" : "bg-[#0B1A2E]"}`}
            />
            <span
              className={`relative inline-flex size-2 rounded-full ring-1 ring-white ${changed ? "bg-[#C2410C]" : "bg-[#0B1A2E]"}`}
            />
          </span>
        </span>
        <span className="truncate">{status}</span>
      </span>
      <span className="flex shrink-0 items-center gap-0.5 rounded-[5px] bg-[rgba(255,255,255,0.45)] px-1.5 py-0.5 font-extrabold transition-colors group-hover:bg-[#0B1A2E] group-hover:text-white">
        {action}
        <ArrowGlyph />
      </span>
    </button>
  );
}

/** Paper plane sitting level, not yet sent. */
function PlaneGrounded() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="size-[12px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 10.5 17 4.5l-3.2 11.2-4.3-3.6-3.3 2.6.5-4.2L2.5 10.5Z" />
      <path d="m6.9 10.5 6.9-4.4" strokeLinecap="round" />
      <path d="M2 17.5h16" strokeLinecap="round" strokeDasharray="1.5 2.2" />
    </svg>
  );
}

/** Paper plane in flight, sent. */
function PlaneInFlight() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="size-[13px]"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.2 2.1 1.9 8.6c-.7.3-.7 1.3 0 1.5l4.5 1.6 1.6 5c.2.7 1.1.9 1.6.3l2.4-2.7 4 3c.6.4 1.4.1 1.5-.6l2.1-13.5c.1-.8-.6-1.4-1.4-1.1ZM8.1 11.4l7.1-5.6-5.8 6.6-.4 2.6-.9-3.6Z" />
    </svg>
  );
}

function ArrowGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-[9px] transition-transform motion-safe:group-hover:translate-x-0.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" />
    </svg>
  );
}
