"use client";

import Image from "next/image";
import Link from "next/link";
import { usePortalLogout } from "@/hooks/usePortalLogout";

/**
 * Admin/operations sidebar, matching the Easylink Designer DistNav artboard:
 * the same groups, order, icons and count badges, plus its animated
 * "glitter" icons (a traced stroke + twinkling sparks, see `.el-nav` in
 * globals.css).
 *
 * Items without an `href` have no page in this app yet. They keep the
 * design's styling rather than being greyed out, but don't navigate and say
 * so on hover — most of the AI-operations, energy-services and platform
 * admin sections are in that state.
 */
const ICONS = {
  grid: "M4 3h5a1 1 0 0 1 1 1v5a1 1 0 0 1 -1 1h-5a1 1 0 0 1 -1 -1v-5a1 1 0 0 1 1 -1zM15 3h5a1 1 0 0 1 1 1v5a1 1 0 0 1 -1 1h-5a1 1 0 0 1 -1 -1v-5a1 1 0 0 1 1 -1zM15 14h5a1 1 0 0 1 1 1v5a1 1 0 0 1 -1 1h-5a1 1 0 0 1 -1 -1v-5a1 1 0 0 1 1 -1zM4 14h5a1 1 0 0 1 1 1v5a1 1 0 0 1 -1 1h-5a1 1 0 0 1 -1 -1v-5a1 1 0 0 1 1 -1z",
  sun: "M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41",
  file: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7ZM14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8",
  send: "M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11zM21.854 2.147l-10.94 10.939",
  box: "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73zM12 22V12M3.3 7l7.703 4.734a2 2 0 0 0 1.994 0L20.7 7M7.5 4.27l9 5.15",
  check: "M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-6a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1zM16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 14l2 2 4-4",
  receipt: "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1ZM16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 17.5v-11",
  tool: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
  home: "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  cart: "M7 21a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M18 21a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12",
  card: "M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-16a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2zM2 10L22 10",
  percent:
    "M19 5L5 19M4 6.5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0M15 17.5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0",
  tag: "M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42zM7 7.5a0.5 0.5 0 1 0 1 0a0.5 0.5 0 1 0 -1 0",
  shield: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1zM9 12l2 2 4-4",
  key: "M15 7a4 4 0 1 1-3.9 5H9v2H7v2H4v-3l6.1-6.1A4 4 0 0 1 15 7zM16 8h.01",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  crown: "M3 7l4 4 5-6 5 6 4-4-2 12H5z",
  truck: "M1 3h15v13H1zM16 8h4l3 3v5h-7zM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  pin: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0M9 10a3 3 0 1 0 6 0a3 3 0 1 0 -6 0",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  layers: "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83ZM22 17.65l-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65M22 12.65l-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65",
  bolt: "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8L12 3L7 8M12 3L12 15",
  headset: "M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3ZM21 16v2a4 4 0 0 1-4 4h-5",
  chat: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z",
  link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  palette:
    "M13 6.5a0.5 0.5 0 1 0 1 0a0.5 0.5 0 1 0 -1 0M17 10.5a0.5 0.5 0 1 0 1 0a0.5 0.5 0 1 0 -1 0M8 7.5a0.5 0.5 0 1 0 1 0a0.5 0.5 0 1 0 -1 0M6 12.5a0.5 0.5 0 1 0 1 0a0.5 0.5 0 1 0 -1 0M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z",
  spark:
    "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0zM20 3v4M22 5h-4M4 17v2M5 18H3",
  route: "M3 19a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15M15 5a3 3 0 1 0 6 0a3 3 0 1 0 -6 0",
  flask: "M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2M8.5 2h7M7 16h10",
  pulse: "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",
  drone: "M4 4h5M15 4h5M6.5 4v3M17.5 4v3M9 9h6v5H9zM6.5 7 9 9.5M17.5 7 15 9.5M10 14l-1.5 3M14 14l1.5 3M12 11.5h.01",
  gear: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0",
  phone:
    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z",
} as const;

type NavItem = {
  key: string;
  label: string;
  icon: keyof typeof ICONS;
  /** `undefined` = no page behind it yet; the row renders but doesn't navigate. */
  href?: string;
  badge?: string;
};

type NavGroup = {
  title: string;
  /** Group chips from the design: NEW / ADMIN / SHARED. */
  tag?: "new" | "admin" | "shared";
  items: NavItem[];
};

const GROUPS: NavGroup[] = [
  {
    title: "",
    items: [
      { key: "overview", label: "Overview", icon: "home", href: "/master/dashboard" },
      { key: "sales", label: "Sales dashboard", icon: "grid", href: "/master/sales" },
      { key: "quotes", label: "Quotes & Leads", icon: "file", href: "/master/quotes-leads", badge: "12" },
      { key: "insights", label: "Insights · Clarity", icon: "eye" },
    ],
  },
  {
    title: "Installer network",
    tag: "new",
    items: [
      { key: "dispatch", label: "Dispatch", icon: "send", href: "/master/dispatch", badge: "2" },
      { key: "jobs", label: "Jobs & Installs", icon: "box", href: "/master/jobs" },
      {
        key: "handover",
        label: "Handover review",
        icon: "check",
        href: "/master/handover-review",
        badge: "3",
      },
      {
        key: "payouts",
        label: "Installer payouts",
        icon: "receipt",
        href: "/master/installer-payouts",
      },
      { key: "installers", label: "Installers", icon: "tool", href: "/master/installers", badge: "1" },
    ],
  },
  {
    title: "EasyLink Marketplace",
    tag: "new",
    items: [
      { key: "ready", label: "Ready Sites", icon: "pin", href: "/master/ready-sites", badge: "4" },
    ],
  },
  {
    title: "AI operations",
    tag: "new",
    items: [
      { key: "aiControl", label: "AI control centre", icon: "spark", href: "/master/ai-control" },
      { key: "aiJourneys", label: "Live journeys", icon: "route", href: "/master/live-journeys", badge: "41" },
      { key: "aiApprovals", label: "AI approvals", icon: "check", href: "/master/ai-approvals", badge: "7" },
      { key: "aiDecisions", label: "Decision records", icon: "file", href: "/master/decision-records" },
      { key: "aiPolicies", label: "Policies", icon: "shield", href: "/master/policies" },
      {
        key: "aiQuality",
        label: "Testing & autonomy",
        icon: "flask",
        href: "/master/testing-autonomy",
      },
    ],
  },
  {
    title: "Energy services",
    tag: "new",
    items: [
      {
        key: "fleet",
        label: "Live fleet & alerts",
        icon: "pulse",
        href: "/master/fleet-live",
        badge: "5",
      },
      { key: "drone", label: "Drone flights", icon: "drone", href: "/master/drone-flights" },
      { key: "vpp", label: "VPP trading", icon: "bolt", href: "/master/vpp-trading" },
    ],
  },
  {
    title: "Pricing engine",
    tag: "new",
    items: [
      { key: "pengine", label: "Quote tester", icon: "percent", href: "/master/quote-tester" },
      { key: "pbook", label: "Price book & rules", icon: "tag", href: "/master/price-book" },
    ],
  },
  {
    title: "Supply & ordering",
    items: [
      { key: "order", label: "Place order", icon: "cart", href: "/master/place-order" },
      { key: "dOrders", label: "Orders & Invoices", icon: "receipt", href: "/master/orders" },
      { key: "payments", label: "Payments", icon: "card", href: "/master/payments" },
      { key: "dPricing", label: "Pricing & Stock", icon: "tag", href: "/master/pricing-stock" },
      {
        key: "dTeam",
        label: "Installer trade accounts",
        icon: "users",
        href: "/master/installer-trade-accounts",
      },
    ],
  },
  {
    title: "Design & Sizing",
    tag: "shared",
    items: [
      { key: "designs", label: "Solar designer · SLD", icon: "layers", href: "/master/solar-designer" },
    ],
  },
  {
    title: "Communication",
    items: [
      { key: "cc", label: "Contact Centre", icon: "headset", href: "/master/contact-centre" },
      { key: "dialer", label: "Agent Dialer", icon: "phone", href: "/master/dialer" },
      { key: "calls", label: "Calls", icon: "phone", href: "/master/calls" },
      { key: "lists", label: "Contact lists", icon: "upload", href: "/master/contact-lists" },
      { key: "inbox", label: "Inbox", icon: "chat", badge: "6", href: "/master/inbox" },
    ],
  },
  {
    title: "Admin",
    tag: "admin",
    items: [
      { key: "admin", label: "Admin home", icon: "shield" },
      { key: "aInstallers", label: "Installers", icon: "tool" },
      { key: "aCustomers", label: "Customers", icon: "users" },
      { key: "aPartners", label: "Partners & suppliers", icon: "truck" },
      { key: "aApprovals", label: "Approvals", icon: "check", badge: "3" },
      { key: "aPlans", label: "Memberships & plans", icon: "crown" },
      { key: "aStaff", label: "Staff & roles", icon: "key" },
      { key: "aAudit", label: "Audit log", icon: "list" },
      { key: "aSettings", label: "Platform settings", icon: "gear" },
      { key: "theme", label: "Theme · gradient builder", icon: "palette" },
    ],
  },
  {
    title: "Account",
    items: [{ key: "compat", label: "How accounts connect", icon: "link" }],
  },
];

const GROUP_TAG: Record<
  NonNullable<NavGroup["tag"]>,
  { label: string; bg: string; fg: string }
> = {
  new: { label: "NEW", bg: "#F68A0A", fg: "#3B1D00" },
  admin: { label: "ADMIN", bg: "#FFB547", fg: "#3B1D00" },
  shared: { label: "SHARED", bg: "#2A4466", fg: "#E6EDF7" },
};

/** Base stroke + a dashed copy that traces it, plus three twinkling sparks. */
function GlitterIcon({ d, active, sun }: { d: string; active?: boolean; sun?: boolean }) {
  return (
    <svg
      className={`gi${sun ? " gi-sun" : ""}`}
      width={sun ? 20 : 18}
      height={sun ? 20 : 18}
      viewBox="0 0 24 24"
      fill="none"
      stroke={sun ? "#3B1D00" : active ? "#FFB547" : "#E2BC63"}
      strokeWidth={sun ? 2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
      <path d={d} className="gl" pathLength={100} />
      <path
        className="sp s1"
        d="M21.5 -.6l.75 1.95 1.95.75-1.95.75-.75 1.95-.75-1.95-1.95-.75 1.95-.75z"
      />
      <path className="sp s2" d="M2.2 18.6l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5z" />
      <circle className="sp s3" cx="21" cy="20.5" r="1" />
    </svg>
  );
}

type Props = {
  active: string;
  accountName?: string;
  personName?: string;
};

export function MasterDistSidebar({
  active,
  accountName = "Easylink Plus Pty Ltd",
  personName = "Daniel Shaw · Owner",
}: Props) {
  const { logout, pending } = usePortalLogout("admin");

  return (
    <nav
      aria-label="Main menu"
      className="el-nav flex w-full flex-col gap-[18px] px-3 py-5 font-inter"
      style={{ background: "#0B1A2E", color: "#E6EDF7", minHeight: "100%" }}
    >
      <Link
        href="/master/dashboard"
        className="flex items-center gap-2.5 px-2.5 pb-2 pt-1 text-white no-underline"
      >
        <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[#F68A0A]">
          <Image
            src="/images/solarDesignLogo.png"
            alt=""
            width={20}
            height={20}
            className="size-5 object-contain"
          />
        </span>
        <span className="flex flex-col leading-[1.1]">
          <span className="gt font-source-sans text-[18px] font-bold">EasyLink Solar</span>
          <span className="text-[11px]" style={{ color: "#9FB0C8" }}>
            EasyLink Operations
          </span>
        </span>
      </Link>

      <div className="flex flex-col gap-1.5 rounded-xl p-2.5" style={{ background: "#13263F" }}>
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "#8FA1BA" }}
        >
          Signed in as
        </span>
        <span className="gt w-fit text-[14px] font-semibold text-white">{accountName}</span>
        <span className="flex flex-wrap gap-1.5">
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-bold"
            style={{ background: "#7EC8F7", color: "#0B2540" }}
          >
            Operations
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ background: "#1B3557", color: "#C3CFDF" }}
          >
            {personName}
          </span>
        </span>
        <span
          title="Switching between accounts isn't built yet"
          className="w-fit cursor-default text-[12px] font-semibold"
          style={{ color: "#FFB547" }}
        >
          Switch account
        </span>
      </div>

      {GROUPS.map((group) => {
        const tag = group.tag ? GROUP_TAG[group.tag] : null;

        return (
          <div key={group.title || "ungrouped"} className="flex flex-col gap-0.5">
            {group.title ? (
              <div className="flex items-center gap-2 px-2.5 py-1.5">
                <span
                  className="text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: "#8FA1BA" }}
                >
                  {group.title}
                </span>
                {tag ? (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] tracking-[0.04em]"
                    style={{ background: tag.bg, color: tag.fg }}
                  >
                    {tag.label}
                  </span>
                ) : null}
              </div>
            ) : null}

            {group.items.map((item) => {
              const isActive = item.key === active;
              const d = ICONS[item.icon];

              const badge = item.badge ? (
                <span
                  className="min-w-5 rounded-full px-1.5 py-px text-center text-[11px] font-bold"
                  style={
                    isActive
                      ? { background: "#F68A0A", color: "#3B1D00" }
                      : { background: "#2A4466", color: "#FFFFFF" }
                  }
                >
                  {item.badge}
                </span>
              ) : null;

              if (!item.href) {
                return (
                  <span
                    key={item.key}
                    aria-disabled="true"
                    title="Not built yet"
                    className="flex min-h-9 cursor-default items-center gap-2.5 rounded-[9px] px-2.5 text-[14px] font-medium"
                    style={{ color: "#C3CFDF" }}
                  >
                    <GlitterIcon d={d} />
                    <span className="flex-grow">{item.label}</span>
                    {badge}
                  </span>
                );
              }

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className="flex min-h-9 items-center gap-2.5 rounded-[9px] px-2.5 text-[14px] no-underline"
                  style={
                    isActive
                      ? { background: "#1B3557", color: "#FFFFFF", fontWeight: 600 }
                      : { color: "#C3CFDF", fontWeight: 500 }
                  }
                >
                  <GlitterIcon d={d} active={isActive} />
                  <span className="flex-grow">{item.label}</span>
                  {badge}
                </Link>
              );
            })}
          </div>
        );
      })}

      <div
        className="mt-auto flex flex-col gap-1.5 rounded-xl p-3"
        style={{ background: "#13263F" }}
      >
        <span className="text-[12px]" style={{ color: "#9FB0C8" }}>
          AI agents · Voxa voice &amp; chat connected
        </span>
        <span className="text-[14px] font-semibold text-white">
          9 of 10 agents on · normal autonomy
        </span>
        <span className="text-[12px]" style={{ color: "#7EE2A0" }}>
          7 actions waiting for a person
        </span>
        <span
          title="No AI agent system to pause yet"
          className="mt-1 flex h-9 cursor-default items-center justify-center rounded-[9px] border text-[12px] font-bold"
          style={{ borderColor: "#F87171", color: "#FECACA" }}
        >
          Pause all agents
        </span>
      </div>

      <button
        type="button"
        onClick={() => void logout()}
        disabled={pending}
        className="flex min-h-9 items-center gap-2.5 rounded-[9px] px-2.5 text-left text-[14px] font-medium disabled:opacity-50"
        style={{ color: "#C3CFDF" }}
      >
        Sign out
      </button>
    </nav>
  );
}
