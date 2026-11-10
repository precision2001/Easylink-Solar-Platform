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
        className={`group inline-flex w-full min-w-0 items-center gap-1.5 border border-[#A7E3C4] bg-[#EEFBF3] pl-1 pr-2.5 font-semibold text-[#05603A] transition-colors hover:border-[#4CC38A] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2563EB] disabled:cursor-default ${box}`}
      >
        <StateLight tone="sent" />
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
      <span className="flex min-w-0 items-center gap-1.5">
        <StateLight tone={changed ? "edited" : "unsent"} />
        <span className="truncate">{status}</span>
      </span>
      <span className="flex shrink-0 items-center gap-0.5 rounded-[5px] bg-[rgba(255,255,255,0.45)] px-1.5 py-0.5 font-extrabold transition-colors group-hover:bg-[#0B1A2E] group-hover:text-white">
        {action}
        <ArrowGlyph />
      </span>
    </button>
  );
}

const LIGHT = {
  unsent: { core: "#FF3B4E", deep: "#9F1239", glow: "rgba(255,59,78,0.85)" },
  edited: { core: "#3B82F6", deep: "#1E3A8A", glow: "rgba(59,130,246,0.85)" },
  sent: { core: "#22C55E", deep: "#166534", glow: "rgba(34,197,94,0.8)" },
} as const;

/**
 * A round holographic light: an iridescent rim that slowly turns around a
 * lit core in the state's colour (red not sent, blue edited since sent,
 * green sent). Unsent and edited breathe; sent holds steady. Motion stops
 * for people who ask for reduced motion.
 */
function StateLight({ tone }: { tone: keyof typeof LIGHT }) {
  const c = LIGHT[tone];
  return (
    <span
      aria-hidden="true"
      className="relative ml-1 inline-flex size-[14px] shrink-0"
    >
      <span
        className="absolute inset-0 rounded-full motion-safe:animate-[spin_3.5s_linear_infinite]"
        style={{
          background:
            "conic-gradient(from 0deg, #ff7ad9, #8cf6ff, #b9ff8a, #ffe46b, #c4a1ff, #ff7ad9)",
        }}
      />
      <span
        className={`absolute inset-[2.5px] rounded-full ${tone === "sent" ? "" : "motion-safe:animate-pulse"}`}
        style={{
          background: `radial-gradient(circle at 34% 30%, #ffffff 0 16%, ${c.core} 48%, ${c.deep} 100%)`,
          boxShadow: `0 0 6px 1px ${c.glow}, inset 0 0 2px rgba(255,255,255,0.6)`,
        }}
      />
    </span>
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
