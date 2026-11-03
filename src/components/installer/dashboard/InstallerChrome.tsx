"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

import { CartButton } from "@/components/cart/CartButton";
import { DashboardNotificationBell } from "@/components/dashboard/DashboardNotificationBell";
import { InstNav } from "@/components/installer/dashboard/InstNav";

/**
 * The installer portal's one navigation: the InstNav sidebar on large screens
 * and, below `lg`, a menu button that opens the same InstNav in a drawer. A
 * slim top bar carries the cart and notifications on every size. Every
 * installer page sits inside it, so no page needs its own header — older
 * pages that still render `InstallerHeader` get nothing extra (see
 * `useInsideInstallerChrome`).
 */
const InsideChrome = createContext(false);

/** True inside the installer dashboard layout, which already draws navigation. */
export function useInsideInstallerChrome(): boolean {
  return useContext(InsideChrome);
}

export function InstallerChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);

  // A route change closes the drawer. Derived during render rather than in an
  // effect, so the new page never paints behind an open drawer.
  if (open && openedAt !== pathname) {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <InsideChrome.Provider value>
      <div className="flex min-h-screen flex-col text-warm-ink lg:flex-row">
        <aside className="sticky top-0 hidden h-screen w-62 shrink-0 overflow-y-auto lg:block">
          <InstNav />
        </aside>


        {open ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 h-full w-full cursor-default bg-[#0B1A2E]/60"
              onClick={() => setOpen(false)}
            />
            <div
              id="installer-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Installer menu"
              className="absolute inset-y-0 left-0 flex w-[min(86vw,300px)] flex-col overflow-y-auto shadow-xl"
              style={{ background: "#0B1A2E" }}
            >
              <div className="flex justify-end px-3 pt-3">
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                  className="flex size-11 items-center justify-center rounded-[10px] text-white hover:bg-white/10"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              <InstNav onNavigate={() => setOpen(false)} />
            </div>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          {/*
            Top bar. Phones and tablets: menu, logo, cart, notifications.
            Large screens: just cart and notifications (the sidebar has the
            rest) — the tools every installer page had in the old header.
          */}
          <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-[#E3E8EF] bg-white px-3 lg:h-12 lg:px-6">
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="installer-menu"
              onClick={() => {
                setOpenedAt(pathname);
                setOpen(true);
              }}
              className="flex size-11 items-center justify-center rounded-[10px] text-[#0F172A] hover:bg-[#F1F5F9] lg:hidden"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link
              href="/installers/dashboard/home"
              className="flex min-w-0 items-center gap-2 text-[#0F172A] no-underline lg:hidden"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-[#F68A0A]">
                <Image src="/images/solarDesignLogo.png" alt="" width={18} height={18} className="size-[18px] object-contain" />
              </span>
              <span className="truncate font-source-sans text-[17px] font-bold">EasyLink Solar</span>
            </Link>
            <span className="flex-1" />
            <CartButton />
            <DashboardNotificationBell mode="installer" />
          </header>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </InsideChrome.Provider>
  );
}
