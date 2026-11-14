"use client";

import Link from "next/link";
import { CartButton } from "@/components/cart/CartButton";
import { CustomerAvatar } from "@/components/customer/CustomerAvatar";
import { DashboardNotificationBell } from "@/components/dashboard/DashboardNotificationBell";
import { useAppSelector } from "@/lib/store/hooks";
import type { CustomerPortalNavKey } from "@/utils/constant";

/**
 * The customer top bar from the Easylink Designer mock (CustNav.dc.html) — a
 * navy strip with the brand, a horizontal tab row and the account controls,
 * replacing the portal's left sidebar.
 *
 * Every tab here has a page. Energy and VPP are built from their design
 * mocks with sample data, because this app reads no inverter and has no VPP
 * enrolment — each of those pages says so on itself rather than here.
 *
 * The `href`-less branch below is kept deliberately: it is how a tab the
 * design shows but this app cannot serve yet would render, rather than as a
 * link to a 404.
 *
 * The badge counts in the design (My project 1, Messages 2) are the mock's
 * sample numbers. Nothing here counts open project tasks or unread messages,
 * so they are not reproduced — a hardcoded "2" next to Messages would be read
 * as a real unread count.
 */

type Tab = {
  key: CustomerPortalNavKey;
  label: string;
  /** Absent for a tab the design shows but this app cannot serve yet. */
  href?: string;
};

const TABS: Tab[] = [
  { key: "dashboard", label: "Home", href: "/customers/dashboard" },
  { key: "designs", label: "My design", href: "/customers/design" },
  { key: "project", label: "My project", href: "/customers/project" },
  { key: "energy", label: "Energy", href: "/customers/energy" },
  { key: "vpp", label: "VPP", href: "/customers/vpp" },
  { key: "maintenance", label: "Maintenance", href: "/customers/solar-maintenance" },
  { key: "messages", label: "Messages", href: "/customers/messages" },
  { key: "products", label: "Shop", href: "/customers/products" },
  { key: "payments", label: "Payments", href: "/customers/payments" },
  { key: "profile", label: "Profile", href: "/customers/profile" },
];

const UNBUILT_TITLE =
  "Not built yet — this needs live inverter data, which isn't connected";

function SunMark() {
  return (
    <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[#F68A0A]">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#3B1D00"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    </span>
  );
}

export function CustomerTopNav({ active }: { active: CustomerPortalNavKey }) {
  const user = useAppSelector((s) => s.customerAuth.user);

  return (
    <header className="w-full bg-[#0B1A2E] px-4 py-3 text-[#E6EDF7] sm:px-6">
      <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center gap-x-5 gap-y-3">
        <Link
          href="/customers/dashboard"
          className="flex shrink-0 items-center gap-2.5 text-white no-underline"
        >
          <SunMark />
          <span className="flex flex-col leading-[1.1]">
            <span className="font-source-sans text-[18px] font-bold">
              EasyLink Solar
            </span>
            <span className="text-[11px] text-[#9FB0C8]">My solar</span>
          </span>
        </Link>

        <nav
          aria-label="Main menu"
          className="flex min-w-0 flex-1 basis-[520px] gap-0.5 overflow-x-auto"
        >
          {TABS.map((tab) => {
            const on = tab.key === active;

            if (!tab.href) {
              return (
                <span
                  key={tab.key}
                  aria-disabled="true"
                  title={UNBUILT_TITLE}
                  className="flex h-10 shrink-0 cursor-help items-center rounded-[9px] px-3 text-[14px] font-medium text-[#8094AE]"
                >
                  {tab.label}
                </span>
              );
            }

            return (
              <Link
                key={tab.key}
                href={tab.href}
                prefetch={false}
                aria-current={on ? "page" : undefined}
                className={
                  on
                    ? "flex h-10 shrink-0 items-center rounded-[9px] bg-[#1B3557] px-3 text-[14px] font-semibold text-white no-underline shadow-[inset_0_-3px_0_#F68A0A]"
                    : "flex h-10 shrink-0 items-center rounded-[9px] px-3 text-[14px] font-medium text-[#C3CFDF] no-underline hover:bg-white/5 hover:text-white"
                }
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <CartButton tone="dark" className="size-10" />
          <DashboardNotificationBell
            mode="customer"
            bellButtonClassName="relative flex size-10 items-center justify-center rounded-[10px] bg-[#13263F] text-[#FFB547] hover:bg-[#1B3557]"
            bellIconClassName="size-[18px]"
          />
          <Link
            href="/customers/profile"
            aria-label="My account"
            className="rounded-full"
          >
            <CustomerAvatar
              firstName={user?.firstName}
              lastName={user?.lastName}
              size="md"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
