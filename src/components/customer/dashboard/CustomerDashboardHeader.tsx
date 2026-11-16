"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { CustomerAvatar } from "@/components/customer/CustomerAvatar";
import { DashboardNotificationBell } from "@/components/dashboard/DashboardNotificationBell";
import { CartButton } from "@/components/cart/CartButton";
import { usePortalLogout } from "@/hooks/usePortalLogout";
import {
  CUSTOMER_PORTAL,
  type CustomerPortalNavKey,
} from "@/utils/constant";

type Props = {
  firstName?: string | null;
  lastName?: string | null;
  activeNav?: CustomerPortalNavKey;
  /** Extra controls (e.g. My Design toolbar) shown before search / notifications. */
  headerAccessory?: ReactNode;
};

export function CustomerDashboardHeader({
  firstName,
  lastName,
  activeNav = "dashboard",
  headerAccessory,
}: Props) {
  const { logout, pending } = usePortalLogout("customer");

  return (
    <header className="customer-header-bg sticky top-0 z-40 border-b customer-header-border">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <Link href="/" className="flex shrink-0 items-center gap-4 sm:gap-5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-navy-800">
              <Image
                src="/images/solarDesignLogo.png"
                alt="Solar Design Logo"
                width={30}
                height={30}
              />
            </div>
            <span
              className="font-inter text-[14px] font-bold leading-[21px] tracking-[0.2px] customer-text-on-dark"
              style={{ fontFeatureSettings: '"liga" 1' }}
            >
              {firstName?.trim() ? `${firstName.trim()} Dashboard` : "My Dashboard"}
            </span>
          </Link>
          <div
            className="customer-header-divider hidden h-6 w-px shrink-0 sm:block"
            aria-hidden
          />
        </div>

        <nav
          className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:justify-center md:gap-x-5"
          aria-label="Primary"
        >
          {CUSTOMER_PORTAL.nav.map((item) => {
            const active = item.key === activeNav;
            return (
              <Link
                key={item.key}
                href={item.href}
                className="relative pb-1 font-inter text-[14px] font-medium leading-[21px] tracking-[-0.15px]"
              >
                <span
                  className={
                    active
                      ? "customer-nav-active"
                      : "customer-nav-muted hover:text-white"
                  }
                >
                  {item.label}
                </span>
                {active ? (
                  <span
                    className="customer-nav-underline absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    aria-hidden
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 md:gap-4">
          {headerAccessory}
          <CartButton tone="dark" className="size-8" />
          <DashboardNotificationBell mode="customer" />
          <button
            type="button"
            onClick={() => void logout()}
            disabled={pending}
            className="font-inter rounded-md px-2 py-1 text-[13px] font-medium customer-nav-muted hover:customer-text-on-dark disabled:opacity-50"
          >
            Log out
          </button>
          <CustomerAvatar firstName={firstName} lastName={lastName} size="md" />
        </div>
      </div>
    </header>
  );
}
