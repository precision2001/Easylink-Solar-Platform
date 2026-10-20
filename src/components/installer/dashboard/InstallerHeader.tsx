"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { DashboardNotificationBell } from "@/components/dashboard/DashboardNotificationBell";
import Icon from "@/components/ui/Icons";
import { usePortalLogout } from "@/hooks/usePortalLogout";

const NAV = [
  {
    href: "/installers/dashboard/overview",
    label: "Overview",
    key: "overview",
  },
  { href: "/installers/dashboard/home", label: "Home", key: "home" },
  {
    href: "/installers/dashboard/pipeline",
    label: "Pipeline",
    key: "pipeline",
  },
  {
    href: "/installers/dashboard/jobs",
    label: "Jobs",
    key: "jobs",
  },
  {
    href: "/installers/dashboard/projects",
    label: "Customer files",
    key: "projects",
  },
  {
    href: "/installers/dashboard/account",
    label: "My account",
    key: "account",
  },
  {
    href: "/installers/dashboard/equipment",
    label: "Equipment",
    key: "equipment",
  },
  {
    href: "/installers/dashboard/messages",
    label: "Messages",
    key: "messages",
  },
  { href: "/installers/dashboard/home", label: "Reports", key: "reports" },
  { href: "/installers/dashboard/home", label: "Settings", key: "settings" },
  { href: "/installers/dashboard/home", label: "Help", key: "help" },
] as const;

type Props = {
  activeNav?: (typeof NAV)[number]["key"];
  userInitials?: string;
  /** When omitted, mobile menu toggle is hidden (pipeline dashboard has no sidebar). */
  onMenuClick?: () => void;
};

function resolveActiveNav(
  pathname: string | null,
  override?: (typeof NAV)[number]["key"],
): (typeof NAV)[number]["key"] {
  if (override) return override;
  if (!pathname) return "home";
  if (pathname.startsWith("/installers/dashboard/overview")) return "overview";
  if (pathname.startsWith("/installers/dashboard/pipeline")) return "pipeline";
  if (pathname.startsWith("/installers/dashboard/account")) return "account";
  if (pathname.startsWith("/installers/dashboard/jobs")) return "jobs";
  if (pathname.startsWith("/installers/dashboard/projects")) return "projects";
  if (pathname.startsWith("/installers/dashboard/equipment")) return "equipment";
  if (pathname.startsWith("/installers/dashboard/messages")) return "messages";
  if (pathname.startsWith("/installers/dashboard/schedule")) return "home";
  return "home";
}

export function InstallerHeader({
  activeNav: activeNavProp,
  userInitials = "ES",
  onMenuClick,
}: Props) {
  const pathname = usePathname();
  const activeNav = resolveActiveNav(pathname, activeNavProp);
  const { logout, pending } = usePortalLogout("installer");
  const mobileNavRef = useRef<HTMLDetailsElement>(null);

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-warm-border bg-cream-50">
      <div className="flex h-[52px] items-center justify-between gap-3 px-4 md:px-5">
        <div className="flex min-w-0 items-center gap-3 md:gap-8">
          {onMenuClick ? (
            <button
              type="button"
              className="flex shrink-0 md:hidden"
              aria-label="Open customers"
              onClick={onMenuClick}
            >
              <Icon name="Users" className="size-6 text-warm-ink" />
            </button>
          ) : null}
          <details ref={mobileNavRef} className="relative shrink-0 md:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-center marker:content-['']">
              <span className="flex size-9 items-center justify-center rounded-full text-warm-ink hover:bg-black/5">
                <Icon name="Menu" className="size-6 text-warm-ink" />
              </span>
            </summary>
            <div className="absolute left-0 mt-2 w-56 overflow-hidden rounded-xl border border-warm-border bg-cream-50 shadow-lg">
              <nav aria-label="Installer navigation" className="grid p-2">
                {NAV.map((item) => {
                  const active = item.key === activeNav;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      prefetch={false}
                      onClick={() => mobileNavRef.current?.removeAttribute("open")}
                      className={`rounded-md px-3 py-2 font-inter text-[14px] font-medium leading-[21px] ${
                        active
                          ? "bg-black/5 text-warm-ink"
                          : "text-warm-gray hover:bg-black/5 hover:text-warm-ink"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </details>
          <Link
            href="/installers/dashboard/home"
            prefetch={false}
            className="flex shrink-0 items-center gap-8"
          >
            <div className="flex size-9 items-center justify-center rounded-[7.72px] bg-navy-800">
              <Image
                src="/images/solarDesignLogo.png"
                alt="Easylink solar"
                width={28}
                height={28}
              />
            </div>
          </Link>
          <nav
            className="hidden min-w-0 items-center gap-5 md:flex lg:gap-6"
            aria-label="Installer"
          >
            {NAV.map((item) => {
              const active = item.key === activeNav;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  prefetch={false}
                  className="relative pb-1 font-inter text-[14px] font-medium leading-[21px]"
                >
                  <span
                    className={
                      active
                        ? "text-warm-ink"
                        : "text-warm-gray hover:text-warm-ink"
                    }
                  >
                    {item.label}
                  </span>
                  {active ? (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-linear-to-b from-yellow-lemon to-orange-amber"
                      aria-hidden
                    />
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-3 md:gap-4">
          <button
            type="button"
            aria-label="Search"
            className="flex size-8 items-center justify-center rounded-full text-warm-ink hover:bg-black/5"
          >
            <Icon name="Search" className="size-[18px] text-warm-gray" />
          </button>
          <DashboardNotificationBell mode="installer" />
          <button
            type="button"
            onClick={() => void logout()}
            disabled={pending}
            className="font-inter rounded-md px-2 py-1 text-[13px] font-medium text-warm-gray hover:text-warm-ink disabled:opacity-50"
          >
            Log out
          </button>
          <div className="flex size-8 items-center justify-center rounded-full bg-linear-to-b from-yellow-lemon to-orange-amber font-inter text-[11px] font-semibold leading-4 tracking-[0.06em] text-warm-black">
            {userInitials}
          </div>
        </div>
      </div>
    </header>
  );
}
