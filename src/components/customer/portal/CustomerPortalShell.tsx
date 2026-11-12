"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CartButton } from "@/components/cart/CartButton";
import { CustomerAvatar } from "@/components/customer/CustomerAvatar";
import { DashboardNotificationBell } from "@/components/dashboard/DashboardNotificationBell";
import { askEasylinkAi } from "@/components/ai-chat/EasylinkAiChatbot";
import { PortalIcon, type PortalIconName } from "@/components/customer/portal/PortalIcon";
import { usePortalLogout } from "@/hooks/usePortalLogout";
import { useAppSelector } from "@/lib/store/hooks";
import type { CustomerPortalNavKey } from "@/utils/constant";

/**
 * The customer portal frame (approved "AI Redesign", Oct 2026): a navy menu
 * grouped by where the customer is in their journey, and an "Ask EasyLink AI"
 * bar on every screen. Pages render inside it and only own their content.
 */

type NavItem = { key: CustomerPortalNavKey; label: string; href: string; icon: PortalIconName; soon?: boolean };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "My home",
    items: [
      { key: "dashboard", label: "Home", href: "/customers/dashboard", icon: "home" },
      { key: "designs", label: "My design", href: "/customers/design", icon: "design" },
      { key: "ar", label: "See it on my home", href: "/customers/see-it", icon: "sun", soon: true },
    ],
  },
  {
    label: "Build and price",
    items: [
      { key: "pricing", label: "Price and rebates", href: "/customers/pricing", icon: "dollar" },
      { key: "works", label: "Additional works", href: "/customers/works", icon: "bolt" },
      { key: "products", label: "Products", href: "/customers/products", icon: "products" },
      { key: "payments", label: "Payments", href: "/customers/payments", icon: "payments" },
    ],
  },
  {
    label: "Go ahead",
    items: [
      { key: "project", label: "My project", href: "/customers/project", icon: "project" },
      { key: "installer", label: "My installer", href: "/customers/installer", icon: "profile" },
      { key: "messages", label: "Messages", href: "/customers/messages", icon: "messages" },
      { key: "voice", label: "Talk to EasyLink AI", href: "/customers/voice", icon: "spark" },
    ],
  },
  {
    label: "After install",
    items: [
      { key: "coach", label: "Energy coach", href: "/customers/energy-coach", icon: "leaf", soon: true },
      { key: "maintenance", label: "Maintenance plan", href: "/customers/solar-maintenance", icon: "maintenance" },
      { key: "privacy", label: "My data and consent", href: "/customers/privacy", icon: "shield" },
      { key: "profile", label: "My account", href: "/customers/profile", icon: "profile" },
    ],
  },
];

const ASK_SUGGESTIONS = [
  "How much will I save each year?",
  "Do I qualify for the battery rebate?",
  "What happens at the site visit?",
];

function SideMenu({ active, onNavigate }: { active: CustomerPortalNavKey; onNavigate?: () => void }) {
  const { logout, pending } = usePortalLogout("customer");
  return (
    <nav aria-label="Customer portal" className="flex h-full flex-col gap-6 overflow-y-auto px-4 pb-5 pt-6">
      <Link href="/" className="flex items-center gap-2.5 px-2 no-underline" onClick={onNavigate}>
        <span className="flex size-9 items-center justify-center rounded-[10px] bg-white/10">
          <Image src="/images/solarDesignLogo.png" alt="" width={26} height={26} />
        </span>
        <span className="font-source-sans text-[20px] font-extrabold tracking-[-0.01em] text-white">
          EasyLink<span className="text-[#FFE866]"> Solar</span>
        </span>
      </Link>

      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="m-0 px-3 pb-1 text-[11.5px] font-semibold text-[#93A6C2]">{group.label}</p>
          {group.items.map((item) => {
            const on = item.key === active;
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={onNavigate}
                aria-current={on ? "page" : undefined}
                className={`group flex min-h-[44px] items-center gap-3 rounded-[12px] px-3 text-[14.5px] font-semibold no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFE866] ${
                  on ? "bg-white text-[#0B1A2E]" : "text-[#E6EDF7] hover:bg-white/[0.07]"
                }`}
              >
                <PortalIcon name={item.icon} size={19} className={on ? "text-[#F68A0A]" : "text-[#7F93B2] group-hover:text-[#C9D6EA]"} />
                {item.label}
                {item.soon ? (
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${on ? "bg-[#FFF4D6] text-[#7A3E00]" : "bg-white/10 text-[#C9D6EA]"}`}>Soon</span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}

      <div className="mt-auto flex flex-col gap-3">
        <div className="flex flex-col gap-2 rounded-[16px] bg-[#16304F] p-4">
          <p className="m-0 flex items-center gap-2 text-[13.5px] font-bold text-white">
            <PortalIcon name="spark" size={16} className="text-[#FFE866]" />
            EasyLink AI
          </p>
          <p className="m-0 text-[12.5px] leading-[1.5] text-[#C9D6EA]">
            Ask about your design, rebates, payments or install date. Answers any time of day.
          </p>
          <button
            type="button"
            onClick={() => {
              onNavigate?.();
              askEasylinkAi();
            }}
            className="mt-1 flex min-h-[44px] items-center justify-center rounded-[12px] bg-[#F68A0A] text-[14px] font-bold text-[#3B1D00] hover:bg-[#FF9A1F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFE866]"
          >
            Start a conversation
          </button>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          disabled={pending}
          className="flex min-h-[44px] items-center gap-3 rounded-[12px] px-3 text-[14px] font-semibold text-[#C9D6EA] hover:bg-white/[0.07] disabled:opacity-50"
        >
          <PortalIcon name="logout" size={18} className="text-[#7F93B2]" />
          {pending ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </nav>
  );
}

/** "Ask anything" bar: hands the question to the EasyLink AI assistant. */
export function AskEasylinkBar({ placeholder }: { placeholder?: string }) {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    askEasylinkAi(q.trim() || undefined);
    setQ("");
  }

  return (
    <form role="search" onSubmit={submit} className="relative flex min-w-0 flex-1 gap-2" aria-label="Ask EasyLink AI">
      <label htmlFor="portal-ask" className="sr-only">
        Ask EasyLink AI anything about your solar
      </label>
      <div className="relative min-w-0 flex-1">
        <PortalIcon name="spark" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#F68A0A]" />
        <input
          id="portal-ask"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={placeholder ?? "Ask EasyLink AI anything"}
          autoComplete="off"
          className="h-12 w-full rounded-[14px] border border-[#CBD5E1] bg-white pl-11 pr-4 text-[15px] text-[#0F172A] placeholder:text-[#7A8AA0] focus-visible:border-[#0B1A2E] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0B1A2E]/10"
        />
        {focused && !q ? (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 hidden rounded-[14px] border border-[#E3E8EF] bg-white p-2 shadow-[0_12px_32px_rgba(15,23,42,0.12)] sm:block">
            <p className="m-0 px-2 pb-1 pt-1 text-[12px] font-semibold text-[#5B6B80]">Try asking</p>
            {ASK_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  askEasylinkAi(s);
                  setFocused(false);
                }}
                className="block w-full rounded-[10px] px-2 py-2 text-left text-[14px] text-[#0F172A] hover:bg-[#F4F6FA]"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <button
        type="submit"
        aria-label="Ask"
        className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-[#0B1A2E] text-[#FFE866] hover:bg-[#16304F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
      >
        <PortalIcon name="send" size={20} />
      </button>
    </form>
  );
}

export function CustomerPortalShell({
  active,
  children,
  toolbar,
}: {
  active: CustomerPortalNavKey;
  children: ReactNode;
  /** Page-specific controls shown in the top bar before the cart and alerts. */
  toolbar?: ReactNode;
}) {
  const user = useAppSelector((s) => s.customerAuth.user);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-[#F4F6FA] font-inter text-[#0F172A]">
      {/* Desktop menu */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[256px] bg-[#0B1A2E] lg:block">
        <SideMenu active={active} />
      </aside>

      {/* Phone / tablet menu */}
      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-[#0B1A2E]/50" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[min(86vw,300px)] bg-[#0B1A2E] shadow-2xl">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="absolute right-3 top-5 flex size-10 items-center justify-center rounded-full text-white hover:bg-white/10"
            >
              <PortalIcon name="close" />
            </button>
            <SideMenu active={active} onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-[256px]">
        <header className="sticky top-0 z-20 border-b border-[#E3E8EF] bg-[#F4F6FA]/90 backdrop-blur supports-[backdrop-filter]:bg-[#F4F6FA]/75">
          <div className="mx-auto flex max-w-[1240px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
              className="flex size-11 shrink-0 items-center justify-center rounded-[12px] border border-[#CBD5E1] bg-white text-[#0B1A2E] lg:hidden"
            >
              <PortalIcon name="menu" />
            </button>
            <AskEasylinkBar />
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              {toolbar}
              <CartButton tone="light" className="size-11" />
              <DashboardNotificationBell
                mode="customer"
                bellButtonClassName="relative flex size-11 items-center justify-center rounded-full text-[#0B1A2E] hover:bg-[#0B1A2E]/[0.06]"
                bellIconClassName="size-5"
              />
              <Link href="/customers/profile" aria-label="My account" className="hidden rounded-full sm:block">
                <CustomerAvatar firstName={user?.firstName} lastName={user?.lastName} size="md" />
              </Link>
            </div>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-4 pb-16 pt-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

/** Page title block used at the top of every portal screen. */
export function PortalPageHeader({
  eyebrow,
  title,
  intro,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        {eyebrow ? <p className="m-0 text-[13px] font-semibold text-[#5B6B80]">{eyebrow}</p> : null}
        <h1 className="m-0 font-source-sans text-[30px] font-extrabold leading-[1.15] tracking-[-0.01em] text-[#0F172A] sm:text-[34px]">
          {title}
        </h1>
        {intro ? <p className="m-0 max-w-[720px] text-[15px] leading-[1.55] text-[#475569]">{intro}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
