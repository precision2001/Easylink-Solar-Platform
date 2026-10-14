"use client";

import Link from "next/link";
import Image from "next/image";
import { usePortalLogout } from "@/hooks/usePortalLogout";

/** Icon stroke paths lifted from the Easylink Designer distributor-portal mock, kept 1:1 for visual match. */
const ICONS = {
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  file: "M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6",
  sun: "M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  send: "M22 2 11 13M22 2l-7 20-4-9-9-4z",
  box: "M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8",
  check: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
  tool: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z",
  cart: "M3 4h2l2.4 11h11L21 7H6.2M9 20h.01M18 20h.01",
  card: "M3 6h18v12H3zM3 10h18M7 15h4",
  percent: "M19 5 5 19M7 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  tag: "M3 12V3h9l9 9-9 9zM8 8h.01",
  users: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M17 3a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3",
  layers: "M12 3 2 8l10 5 10-5zM2 13l10 5 10-5M2 18l10 5 10-5",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
  sld: "M4 4h6v6H4zM14 14h6v6h-6zM7 10v4h10M17 4v10M14 7h6",
  headset: "M4 15v-3a8 8 0 0 1 16 0v3M4 14h3v6H4zM17 14h3v6h-3z",
  chat: "M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-1-3-2 .2-1.4-1.4.2-2-3-1-1 2h-1.6l-1-2-3 1 .2 2L6 8.2 4 8l-1 3 2 1v1.6l-2 1 1 3 2-.2 1.4 1.4-.2 2 3 1 1-2h1.6l1 2 3-1-.2-2 1.4-1.4 2 .2 1-3-2-1z",
  phone: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z",
} as const;

type NavItem = {
  key: string;
  label: string;
  icon: keyof typeof ICONS;
  /** `undefined` = no real page behind it yet — rendered disabled rather than linking anywhere. */
  href?: string;
  badge?: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const GROUPS: NavGroup[] = [
  {
    title: "",
    items: [
      { key: "sales", label: "Sales dashboard", icon: "grid" },
      { key: "quotes", label: "Quotes & Leads", icon: "file" },
      { key: "designs", label: "Solar Designer", icon: "sun" },
    ],
  },
  {
    title: "Installer network",
    items: [
      { key: "dispatch", label: "Dispatch", icon: "send" },
      { key: "jobs", label: "Jobs & Installs", icon: "box" },
      { key: "handover", label: "Handover review", icon: "check" },
      { key: "ipayouts", label: "Installer payouts", icon: "receipt" },
      { key: "installers", label: "Installers", icon: "tool", href: "/master/installers" },
    ],
  },
  {
    title: "Distributor Account",
    items: [
      { key: "overview", label: "Overview", icon: "home", href: "/master/dashboard" },
      { key: "order", label: "Place order", icon: "cart" },
      { key: "orders", label: "Orders & Invoices", icon: "receipt", href: "/master/invoices" },
      { key: "payments", label: "Payments", icon: "card", href: "/master/payments" },
      { key: "commissions", label: "Commissions", icon: "percent" },
      { key: "pricing", label: "Pricing & Stock", icon: "tag", href: "/master/products-pricing" },
      { key: "team", label: "Team & Installers", icon: "users" },
    ],
  },
  {
    title: "Design & Sizing",
    items: [
      { key: "projects", label: "Design projects", icon: "layers" },
      { key: "sizer", label: "System sizer", icon: "bolt" },
      { key: "sld", label: "SLD editor", icon: "sld" },
    ],
  },
  {
    title: "Communication",
    items: [
      { key: "cc", label: "Contact Centre", icon: "headset", href: "/master/contact-centre" },
      { key: "dialer", label: "Agent Dialer", icon: "phone", href: "/master/dialer" },
      { key: "calls", label: "Calls", icon: "phone", href: "/master/calls" },
      { key: "inbox", label: "Inbox · Chat & SMS", icon: "chat" },
    ],
  },
  {
    title: "Account",
    items: [{ key: "settings", label: "Settings", icon: "gear" }],
  },
];

type Props = {
  active: string;
  /** Shown as the signed-in user; this portal has no distributor-company concept yet, so "Admin" stands in for it. */
  accountName?: string;
  personName?: string;
};

export function MasterDistSidebar({
  active,
  accountName = "Easylink Solar",
  personName = "Admin",
}: Props) {
  const { logout, pending } = usePortalLogout("admin");

  return (
    <nav
      aria-label="Main menu"
      className="flex w-full flex-col gap-[18px] px-3 py-5 font-inter"
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
          <span className="font-source-sans text-[18px] font-bold">
            Easylink Solar
          </span>
          <span className="text-[11px]" style={{ color: "#9FB0C8" }}>
            Partner portal
          </span>
        </span>
      </Link>

      <div
        className="flex flex-col gap-1.5 rounded-xl p-2.5"
        style={{ background: "#13263F" }}
      >
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "#8FA1BA" }}
        >
          Signed in as
        </span>
        <span className="text-[14px] font-semibold text-white">
          {accountName}
        </span>
        <span className="flex flex-wrap gap-1.5">
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-bold"
            style={{ background: "#7EC8F7", color: "#0B2540" }}
          >
            Distributor
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ background: "#1B3557", color: "#C3CFDF" }}
          >
            {personName}
          </span>
        </span>
      </div>

      {GROUPS.map((group) => (
        <div key={group.title || "ungrouped"} className="flex flex-col gap-0.5">
          {group.title ? (
            <div
              className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "#8FA1BA" }}
            >
              {group.title}
            </div>
          ) : null}
          {group.items.map((item) => {
            const isActive = item.key === active;
            const d = ICONS[item.icon];

            if (!item.href) {
              return (
                <span
                  key={item.key}
                  aria-disabled="true"
                  title="Coming soon"
                  className="flex min-h-9 cursor-not-allowed items-center gap-2.5 rounded-[9px] px-2.5 text-[14px] font-medium"
                  style={{ color: "#5C6B80" }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#4C5A6E"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d={d} />
                  </svg>
                  <span className="flex-grow">{item.label}</span>
                  <span className="text-[10px]" style={{ color: "#4C5A6E" }}>
                    Soon
                  </span>
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
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={isActive ? "#FFB547" : "#8FA1BA"}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={d} />
                </svg>
                <span className="flex-grow">{item.label}</span>
                {item.badge ? (
                  <span
                    className="min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold"
                    style={{ background: "#F68A0A", color: "#3B1D00" }}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}

      <button
        type="button"
        onClick={() => void logout()}
        disabled={pending}
        className="mt-auto flex min-h-9 items-center gap-2.5 rounded-[9px] px-2.5 text-left text-[14px] font-medium disabled:opacity-50"
        style={{ color: "#C3CFDF" }}
      >
        Sign out
      </button>
    </nav>
  );
}
