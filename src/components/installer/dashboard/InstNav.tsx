"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePortalLogout } from "@/hooks/usePortalLogout";
import { useAppSelector } from "@/lib/store/hooks";
import { PREVIEW_SCREENS } from "@/components/installer/dashboard/previewScreens";

/**
 * Installer sidebar, matching the Easylink Designer InstNav artboard: the
 * same groups, order, icons, tier gating and count badges, plus its
 * animated "glitter" icons (a traced stroke + twinkling sparks, see
 * `.el-nav` in globals.css).
 *
 * Items without an `href` have no page in this app yet. They keep the
 * design's styling rather than being greyed out, but don't navigate and say
 * so on hover.
 */
const ICONS = {
  home: "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  inbox: "M22 12L16 12L14 15L10 15L8 12L2 12M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
  box: "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73zM12 22V12M3.3 7l7.703 4.734a2 2 0 0 0 1.994 0L20.7 7M7.5 4.27l9 5.15",
  check: "M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-6a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1zM16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 14l2 2 4-4",
  receipt: "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1ZM16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 17.5v-11",
  map: "M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0zM15 5.764v15M9 3.236v15",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  file: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7ZM14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8",
  star: "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",
  layers: "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83ZM22 17.65l-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65M22 12.65l-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65",
  chat: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z",
  columns: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2zM9 3v18M15 3v18",
  panel: "M4 9h16l-2 11H6zM9 9l-1 11M15 9l1 11M4.9 14.5h14.2M12 2v3M5.6 4.6l1.4 1.4M18.4 4.6 17 6",
  chart: "M3 3v16a2 2 0 0 0 2 2h16M18 17V9M13 17V5M8 17v-3",
  gauge: "M12 14l4-4M3.34 19a10 10 0 1 1 17.32 0",
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8L12 3L7 8M12 3L12 15",
  headset: "M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3ZM21 16v2a4 4 0 0 1-4 4h-5",
  mega: "M3 11l18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6",
  spark: "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0zM20 3v4M22 5h-4M4 17v2M5 18H3",
  lock: "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-7a2 2 0 0 1 2 -2zM7 11V7a5 5 0 0 1 10 0v4",
  crown: "M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294zM5 21h14",
  tag: "M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42zM7 7.5a0.5 0.5 0 1 0 1 0a0.5 0.5 0 1 0 -1 0",
  link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  calendar: "M8 2v4M16 2v4M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM3 10h18",
  pin: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0M9 10a3 3 0 1 0 6 0a3 3 0 1 0 -6 0",
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
  tag?: "new" | "elite" | "upgrade" | "shared";
  items: NavItem[];
};

const TIER_GROUP_TAG: Record<"elite" | "upgrade", { label: string; bg: string; fg: string }> = {
  elite: { label: "ELITE", bg: "#FFB547", fg: "#3B1D00" },
  upgrade: { label: "UPGRADE", bg: "#2A4466", fg: "#E6EDF7" },
};

const GROUP_TAG: Record<"new" | "shared", { label: string; bg: string; fg: string }> = {
  new: { label: "NEW", bg: "#F68A0A", fg: "#3B1D00" },
  shared: { label: "SHARED", bg: "#2A4466", fg: "#E6EDF7" },
};

function buildGroups(elite: boolean): NavGroup[] {
  return [
    {
      title: "",
      items: [
        { key: "overview", label: "Home", icon: "home", href: "/installers/dashboard/home" },
        {
          key: "schedule",
          label: "Schedule",
          icon: "calendar",
          href: "/installers/dashboard/schedule",
        },
        {
          key: "aiAssist",
          label: "AI assistant",
          icon: "spark",
          href: "/installers/dashboard/ai-assistant",
        },
      ],
    },
    {
      title: "Sales & customers",
      items: [
        { key: "sales", label: "Sales dashboard", icon: "gauge", href: "/installers/dashboard/sales" },
        {
          key: "customers",
          label: "Customers",
          icon: "users",
          href: "/installers/dashboard/customers",
        },
        { key: "messages", label: "Messages", icon: "chat", href: "/installers/dashboard/messages" },
        {
          key: "pipeline",
          label: "Pipeline",
          icon: "columns",
          href: "/installers/dashboard/pipeline-status",
        },
        {
          key: "workflow",
          label: "Project workflow",
          icon: "check",
          href: "/installers/dashboard/project-workflow",
        },
        { key: "equipment", label: "Equipment", icon: "panel", href: "/installers/dashboard/equipment" },
        { key: "validity", label: "Equipment validity", icon: "check", href: "/installers/dashboard/equipment-validity" },
        {
          key: "reports",
          label: "Reports",
          icon: "chart",
          href: "/installers/dashboard/reports",
        },
        {
          key: "analytics",
          label: "Analytics",
          icon: "gauge",
          href: "/installers/dashboard/pipeline",
        },
      ],
    },
    {
      title: "EasyLink Marketplace",
      tag: "new",
      items: [
        {
          key: "ready",
          label: "Ready Sites",
          icon: "pin",
          href: "/installers/dashboard/ready-sites",
        },
        {
          key: "deals",
          label: "Ready Deals",
          icon: "tag",
          href: "/installers/dashboard/ready-deals",
        },
      ],
    },
    {
      title: "EasyLink Jobs",
      items: [
        {
          key: "offers",
          label: "Job offers",
          icon: "inbox",
          href: "/installers/dashboard/job-offers",
        },
        { key: "jobs", label: "My jobs", icon: "box", href: "/installers/dashboard/jobs" },
        {
          key: "handover",
          label: "Handover packs",
          icon: "check",
          href: "/installers/dashboard/handover-packs",
        },
        {
          key: "payouts",
          label: "Payouts & RCTIs",
          icon: "receipt",
          href: "/installers/dashboard/payouts",
        },
      ],
    },
    {
      title: "Installer Account",
      items: [
        {
          key: "areas",
          label: "Service areas",
          icon: "map",
          href: "/installers/dashboard/service-areas",
        },
        {
          key: "crew",
          label: "Crew & accreditations",
          icon: "users",
          href: "/installers/dashboard/crew",
        },
        {
          key: "docs",
          label: "Documents & profile",
          icon: "file",
          href: "/installers/dashboard/documents",
        },
        {
          key: "reviews",
          label: "Reviews",
          icon: "star",
          href: "/installers/dashboard/reviews",
        },
      ],
    },
    {
      title: "Design & Sizing",
      tag: "shared",
      items: [
        {
          key: "projects",
          label: "Solar designer · SLD",
          icon: "layers",
          href: "/installers/dashboard/solar-designer",
        },
        {
          key: "pricing",
          label: "Pricing engine",
          icon: "receipt",
          href: "/installers/dashboard/pricing-engine",
        },
        {
          key: "rates",
          label: "My rates & margin",
          icon: "tag",
          href: "/installers/dashboard/my-rates",
        },
      ],
    },
    {
      title: "Communication",
      tag: elite ? "elite" : "upgrade",
      items: [
        // Every row here is built, so the group tag marks the tier rather than
        // locking the rows: nothing in Communication redirects to the plan page.
        { key: "cc", label: "Contact Centre", icon: "headset", href: "/installers/dashboard/contact-centre" },
        { key: "lists", label: "Contact lists", icon: "upload", href: "/installers/dashboard/contact-lists" },
        { key: "cinbox", label: "Inbox · all channels", icon: "chat", href: "/installers/dashboard/inbox" },
        { key: "campaigns", label: "Campaigns & lists", icon: "mega", href: "/installers/dashboard/campaigns" },
        { key: "ai", label: "AI agents & numbers", icon: "spark", href: "/installers/dashboard/ai-agents" },
      ],
    },
    {
      title: "Account",
      items: [
        { key: "plan", label: "Membership & plan", icon: "crown", href: "/installers/dashboard/plan" },
        { key: "compat", label: "How accounts connect", icon: "link" },
      ],
    },
  ];
}

/** Base stroke + a dashed copy that traces it, plus three twinkling sparks. */
function GlitterIcon({ d, active }: { d: string; active?: boolean }) {
  return (
    <svg
      className="gi"
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "#FFB547" : "#E2BC63"}
      strokeWidth={1.8}
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
  /** Omit to derive the highlighted row from the current route. */
  active?: string;
  /** Membership tier, when known. Omitted = not shown (never guessed). */
  tier?: "starter" | "professional" | "elite";
  /** Override the signed-in name; defaults to the installer session's user. */
  accountName?: string;
  personName?: string;
  /** Called when a row is chosen — the phone drawer closes itself with it. */
  onNavigate?: () => void;
};

/** Longest-prefix match so nested routes keep their section highlighted. */
const ROUTE_KEYS: [string, string][] = [
  ["/installers/dashboard/ai-assistant", "aiAssist"],
  ["/installers/dashboard/customers", "customers"],
  ["/installers/dashboard/sales", "sales"],
  ["/installers/dashboard/messages", "messages"],
  ["/installers/dashboard/project-workflow", "workflow"],
  ["/installers/dashboard/ready-sites", "ready"],
  ["/installers/dashboard/ready-deals", "deals"],
  ["/installers/dashboard/job-offers", "offers"],
  ["/installers/dashboard/jobs", "jobs"],
  ["/installers/dashboard/projects", "jobs"],
  ["/installers/dashboard/account", "docs"],
  ["/installers/dashboard/handover-packs", "handover"],
  ["/installers/dashboard/payouts", "payouts"],
  ["/installers/dashboard/service-areas", "areas"],
  ["/installers/dashboard/crew", "crew"],
  ["/installers/dashboard/documents", "docs"],
  ["/installers/dashboard/reviews", "reviews"],
  ["/installers/dashboard/solar-designer", "projects"],
  ["/installers/dashboard/pricing-engine", "pricing"],
  ["/installers/dashboard/my-rates", "rates"],
  ["/installers/dashboard/contact-centre", "cc"],
  ["/installers/dashboard/contact-lists", "lists"],
  ["/installers/dashboard/pipeline-status", "pipeline"],
  ["/installers/dashboard/pipeline", "analytics"],
  ["/installers/dashboard/reports", "reports"],
  ["/installers/dashboard/equipment", "equipment"],
  ["/installers/dashboard/inbox", "cinbox"],
  ["/installers/dashboard/campaigns", "campaigns"],
  ["/installers/dashboard/ai-agents", "ai"],
  ["/installers/dashboard/plan", "plan"],
  ["/installers/dashboard/home", "overview"],
  ["/installers/dashboard/overview", "overview"],
  ["/installers/dashboard/schedule", "schedule"],
];

function resolveActive(pathname: string | null): string {
  if (!pathname) return "overview";
  const hit = ROUTE_KEYS.filter(([prefix]) => pathname.startsWith(prefix)).sort(
    (a, b) => b[0].length - a[0].length,
  )[0];
  return hit ? hit[1] : "overview";
}

const TIER_LABEL: Record<NonNullable<Props["tier"]>, { label: string; bg: string; fg: string }> = {
  starter: { label: "Starter", bg: "#E2E8F0", fg: "#334155" },
  professional: { label: "Professional", bg: "#7EC8F7", fg: "#0B2540" },
  elite: { label: "Elite", bg: "#FFB547", fg: "#3B1D00" },
};

export function InstNav({
  active: activeProp,
  tier,
  accountName,
  personName,
  onNavigate,
}: Props) {
  const pathname = usePathname();
  const active = activeProp ?? resolveActive(pathname);
  const { logout, pending } = usePortalLogout("installer");
  const user = useAppSelector((st) => st.installerAuth.user);
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  const shownName = accountName ?? (fullName || user?.email || "Installer");
  const shownPerson = personName ?? (fullName && user?.email ? user.email : undefined);
  // Communication is an Elite feature. The group is tagged ELITE unless we
  // know the installer is on a lower plan, when it reads UPGRADE. Rows stay
  // open either way (see buildGroups).
  const elite = tier === undefined || tier === "elite";
  const groups = buildGroups(elite);
  const tierInfo = tier ? TIER_LABEL[tier] : null;

  return (
    <nav
      aria-label="Main menu"
      className="el-nav flex w-full flex-col gap-[18px] px-3 py-5 font-inter"
      style={{ background: "#0B1A2E", color: "#E6EDF7", minHeight: "100%" }}
    >
      <Link
        href="/installers/dashboard/home"
        onClick={onNavigate}
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
            Installer portal
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
        <span className="gt w-fit max-w-full truncate text-[14px] font-semibold text-white">{shownName}</span>
        <span className="flex flex-wrap gap-1.5">
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-bold"
            style={{ background: "#F68A0A", color: "#3B1D00" }}
          >
            Installer
          </span>
          {shownPerson ? (
            <span
              className="max-w-full truncate rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: "#1B3557", color: "#C3CFDF" }}
            >
              {shownPerson}
            </span>
          ) : null}
          {tierInfo ? (
            <Link
              href="/installers/dashboard/plan"
              onClick={onNavigate}
              className="rounded-full px-2 py-0.5 text-[11px] font-bold no-underline"
              style={{ background: tierInfo.bg, color: tierInfo.fg }}
            >
              {tierInfo.label}
            </Link>
          ) : null}
        </span>
      </div>

      {groups.map((group) => {
        const tag =
          group.tag === "new" || group.tag === "shared"
            ? GROUP_TAG[group.tag]
            : group.tag === "elite" || group.tag === "upgrade"
              ? TIER_GROUP_TAG[group.tag]
              : null;

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
                  onClick={onNavigate}
                  className="flex min-h-9 items-center gap-2.5 rounded-[9px] px-2.5 text-[14px] no-underline"
                  style={
                    isActive
                      ? { background: "#1B3557", color: "#FFFFFF", fontWeight: 600 }
                      : { color: "#C3CFDF", fontWeight: 500 }
                  }
                >
                  <GlitterIcon d={d} active={isActive} />
                  <span className="flex-grow">{item.label}</span>
                  {PREVIEW_SCREENS[item.href] ? (
                    <span
                      title="Preview · sample data"
                      className="rounded-full px-1.5 py-px text-[10px] font-semibold"
                      style={{ background: "#2A4466", color: "#E6EDF7" }}
                    >
                      Preview
                    </span>
                  ) : null}
                  {badge}
                </Link>
              );
            })}
          </div>
        );
      })}

      <Link
        href="/installers/dashboard/messages"
        onClick={onNavigate}
        className="mt-auto flex flex-col gap-1 rounded-xl p-3 no-underline"
        style={{ background: "#13263F" }}
      >
        <span className="text-[12px]" style={{ color: "#9FB0C8" }}>
          Need help?
        </span>
        <span className="text-[14px] font-semibold text-white">Message EasyLink support</span>
      </Link>

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
