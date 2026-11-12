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

const GLITTER = {
  unsent: {
    base: "#E11D48",
    deep: "#881337",
    glow: "rgba(244,63,94,0.75)",
    specks: ["#FFFFFF", "#FFD1D9", "#FF8FA3", "#FDE68A"],
  },
  edited: {
    base: "#2563EB",
    deep: "#1E3A8A",
    glow: "rgba(59,130,246,0.75)",
    specks: ["#FFFFFF", "#DBEAFE", "#93C5FD", "#C4B5FD"],
  },
  sent: {
    base: "#16A34A",
    deep: "#14532D",
    glow: "rgba(34,197,94,0.7)",
    specks: ["#FFFFFF", "#DCFCE7", "#86EFAC", "#FDE68A"],
  },
} as const;

/** Tiny round specks at fixed spots, each a hard-edged dot. */
const specks = (
  spots: Array<[number, number, number]>,
  colours: readonly string[],
) =>
  spots
    .map(
      ([x, y, r], i) =>
        `radial-gradient(circle at ${x}% ${y}%, ${colours[i % colours.length]} 0 ${r}px, transparent ${r + 0.35}px)`,
    )
    .join(", ");

const SPOTS_A: Array<[number, number, number]> = [
  [28, 30, 0.9],
  [66, 22, 0.7],
  [78, 60, 0.85],
  [42, 74, 0.7],
  [18, 55, 0.6],
];
const SPOTS_B: Array<[number, number, number]> = [
  [52, 46, 0.8],
  [34, 16, 0.6],
  [72, 82, 0.6],
  [86, 38, 0.65],
  [24, 80, 0.55],
  [58, 64, 0.5],
];

/**
 * A round glitter light in the state's colour (red not sent, blue edited
 * since sent, green sent): a deep base dusted with tinted specks in two
 * layers that twinkle out of step. Unsent and edited glow; sent sparkles
 * quietly. No motion for people who ask for reduced motion.
 */
function StateLight({ tone }: { tone: keyof typeof GLITTER }) {
  const g = GLITTER[tone];
  return (
    <span
      aria-hidden="true"
      className="relative ml-1 inline-flex size-[14px] shrink-0"
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at 35% 30%, ${g.base} 0 40%, ${g.deep} 100%)`,
          boxShadow:
            tone === "sent" ? `0 0 4px ${g.glow}` : `0 0 7px 1px ${g.glow}`,
        }}
      />
      <span
        className="absolute inset-0 rounded-full motion-safe:animate-[glitter-twinkle_1.8s_ease-in-out_infinite]"
        style={{ background: specks(SPOTS_A, g.specks) }}
      />
      <span
        className="absolute inset-0 rounded-full motion-safe:animate-[glitter-twinkle_1.8s_ease-in-out_-0.9s_infinite]"
        style={{ background: specks(SPOTS_B, [...g.specks].reverse()) }}
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
