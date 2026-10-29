"use client";

import Link from "next/link";

/**
 * Installer account section tabs (the design's InstTabs strip). Only the
 * sections with a page in this app navigate; the rest keep the design's
 * styling rather than being greyed out, but don't navigate and say so on
 * hover — same convention as the InstNav sidebar rows that have no route
 * behind them yet.
 */
const TABS: { key: string; label: string; href?: string }[] = [
  { key: "overview", label: "Overview", href: "/installers/dashboard/overview" },
  { key: "offers", label: "Job offers", href: "/installers/dashboard/job-offers" },
  { key: "jobs", label: "My jobs" },
  {
    key: "handover",
    label: "Handover packs",
    href: "/installers/dashboard/handover-packs",
  },
  { key: "payouts", label: "Payouts & RCTIs" },
  { key: "areas", label: "Service areas" },
  { key: "crew", label: "Crew & accreditations" },
  { key: "docs", label: "Documents & profile" },
  { key: "reviews", label: "Reviews" },
];

export function InstallerAccountTabs({ active }: { active: string }) {
  return (
    <nav
      aria-label="Installer account sections"
      className="w-full overflow-x-auto rounded-xl border border-[#E3E8EF] bg-white"
    >
      <div className="flex items-center gap-6 px-4">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          const label = (
            <span
              className={`relative block whitespace-nowrap py-3.5 font-inter text-[14px] ${
                isActive ? "font-semibold text-warm-ink" : "font-medium text-warm-gray"
              }`}
            >
              {tab.label}
              {isActive ? (
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-1 h-0.5 rounded-full bg-linear-to-b from-yellow-lemon to-orange-amber"
                />
              ) : null}
            </span>
          );

          if (!tab.href) {
            return (
              <span
                key={tab.key}
                aria-disabled="true"
                title="Not built yet"
                className="cursor-default"
              >
                {label}
              </span>
            );
          }

          return (
            <Link
              key={tab.key}
              href={tab.href}
              prefetch={false}
              aria-current={isActive ? "page" : undefined}
              className="no-underline hover:[&>span]:text-warm-ink"
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
