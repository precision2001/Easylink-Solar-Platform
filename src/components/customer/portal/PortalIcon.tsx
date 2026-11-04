import type { SVGProps } from "react";

/**
 * Stroke icons for the customer portal (24 px grid, 2 px stroke, currentColor).
 * Kept local so the portal reads as one family.
 */
export type PortalIconName =
  | "home"
  | "design"
  | "project"
  | "maintenance"
  | "messages"
  | "products"
  | "payments"
  | "profile"
  | "spark"
  | "send"
  | "menu"
  | "close"
  | "arrow"
  | "check"
  | "sun"
  | "battery"
  | "bolt"
  | "leaf"
  | "dollar"
  | "calendar"
  | "shield"
  | "logout"
  | "edit"
  | "share"
  | "download"
  | "lock";

const PATHS: Record<PortalIconName, string[]> = {
  home: ["M3 11l9-7 9 7", "M5 10v10h5v-6h4v6h5V10"],
  design: ["M3 20h18", "M5 20l3-10h8l3 10", "M9.5 15h5", "M12 4v3", "M7.5 5.5l1.2 1.7", "M16.5 5.5l-1.2 1.7"],
  project: ["M4 6h16", "M4 12h10", "M4 18h7", "M18 15l2 2 3-4"],
  maintenance: ["M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"],
  messages: ["M4 5h16v11H8l-4 4z", "M8 10h8", "M8 13h5"],
  products: ["M4 7l8-4 8 4-8 4z", "M4 7v10l8 4 8-4V7", "M12 11v10"],
  payments: ["M3 6h18v12H3z", "M3 10h18", "M7 15h4"],
  profile: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"],
  spark: ["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z", "M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"],
  send: ["M4 12l16-8-6 16-3-7z", "M11 13l9-9"],
  menu: ["M4 7h16", "M4 12h16", "M4 17h16"],
  close: ["M6 6l12 12", "M18 6L6 18"],
  arrow: ["M5 12h14", "M13 6l6 6-6 6"],
  check: ["M5 12.5l4.5 4.5L19 7"],
  sun: ["M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M12 2v2", "M12 20v2", "M4.9 4.9l1.4 1.4", "M17.7 17.7l1.4 1.4", "M2 12h2", "M20 12h2", "M4.9 19.1l1.4-1.4", "M17.7 6.3l1.4-1.4"],
  battery: ["M3 8h15v8H3z", "M21 11v2", "M6 11v2", "M9 11v2"],
  bolt: ["M13 2L4 14h7l-1 8 9-12h-7z"],
  leaf: ["M5 19c0-8 6-14 15-14 0 9-6 15-14 15", "M5 19l7-7"],
  dollar: ["M12 3v18", "M16.5 7.5C16 6 14.3 5 12 5c-2.8 0-4.5 1.4-4.5 3.3C7.5 13 16.5 10.5 16.5 15.7 16.5 17.6 14.6 19 12 19c-2.5 0-4.3-1.1-4.8-2.8"],
  calendar: ["M4 6h16v14H4z", "M4 10h16", "M8 3v4", "M16 3v4"],
  shield: ["M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z", "M8.5 12l2.5 2.5 4.5-5"],
  logout: ["M15 4h4v16h-4", "M10 8l-4 4 4 4", "M6 12h10"],
  edit: ["M4 20h4L19 9l-4-4L4 16z", "M13.5 6.5l4 4"],
  share: ["M7 12a2.5 2.5 0 1 1 0-.01", "M17 6a2.5 2.5 0 1 1 0-.01", "M17 18a2.5 2.5 0 1 1 0-.01", "M9.2 10.8l5.6-3.3", "M9.2 13.2l5.6 3.3"],
  download: ["M12 4v11", "M7 10l5 5 5-5", "M5 20h14"],
  lock: ["M6 11h12v10H6z", "M8.5 11V8a3.5 3.5 0 0 1 7 0v3"],
};

export function PortalIcon({
  name,
  size = 20,
  ...rest
}: { name: PortalIconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
