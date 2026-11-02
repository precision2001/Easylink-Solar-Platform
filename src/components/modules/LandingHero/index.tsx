"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import searchIcon from "@/components/ui/Icons/search.svg";
import userIcon from "@/components/ui/Icons/user.svg";
import { LANDING_NAV_ITEMS } from "@/utils/constant";
import { RainbowButton } from "@/components/ui/RainbowButton";
import { CartButton } from "@/components/cart/CartButton";
import { useAppSelector } from "@/lib/store/hooks";
import { usePortalLogout, type PortalLogoutKind } from "@/hooks/usePortalLogout";

/** Shared by the desktop and mobile account menus. `block` so `w-full` applies. */
const PORTAL_LINK_CLASS =
  "block w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-white/90 hover:bg-white/10";

const PORTAL_LABEL: Record<PortalLogoutKind, string> = {
  customer: "Customer",
  installer: "Installer",
  admin: "Distributor",
};

const PORTAL_DASHBOARD_HREF: Record<PortalLogoutKind, string> = {
  customer: "/customers/dashboard",
  installer: "/installers/dashboard/home",
  admin: "/master/dashboard",
};

/**
 * Which signed-in session (if any) is active, so the header can stop
 * showing "Customer login / Installer login / Distributor login" to
 * someone who is already logged in — previously this dropdown never
 * checked auth state at all, so a signed-in visitor had no way to tell
 * from the header that they were logged in, or as whom.
 */
function useActivePortalSession() {
  const customer = useAppSelector((s) => s.customerAuth.user);
  const installer = useAppSelector((s) => s.installerAuth.user);
  const admin = useAppSelector((s) => s.adminAuth.user);

  const { logout: logoutCustomer, pending: customerPending } = usePortalLogout("customer");
  const { logout: logoutInstaller, pending: installerPending } = usePortalLogout("installer");
  const { logout: logoutAdmin, pending: adminPending } = usePortalLogout("admin");

  if (customer) {
    return { kind: "customer" as const, user: customer, logout: logoutCustomer, pending: customerPending };
  }
  if (installer) {
    return { kind: "installer" as const, user: installer, logout: logoutInstaller, pending: installerPending };
  }
  if (admin) {
    return { kind: "admin" as const, user: admin, logout: logoutAdmin, pending: adminPending };
  }
  return null;
}

type ActivePortalSession = ReturnType<typeof useActivePortalSession>;

function AccountMenuContent({ session }: { session: ActivePortalSession }) {
  if (!session) {
    return (
      <>
        <Link href="/customers/auth" className={PORTAL_LINK_CLASS}>
          Customer login
        </Link>
        <Link href="/installers/auth" className={PORTAL_LINK_CLASS}>
          Installer login
        </Link>
        <Link href="/admin/auth" className={PORTAL_LINK_CLASS}>
          Distributor login
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="px-3 py-2">
        <p className="truncate text-sm font-semibold text-white">
          {session.user.firstName} {session.user.lastName}
        </p>
        <p className="text-xs text-white/60">Signed in as {PORTAL_LABEL[session.kind]}</p>
      </div>
      <div className="my-1 h-px bg-white/10" />
      <Link href={PORTAL_DASHBOARD_HREF[session.kind]} className={PORTAL_LINK_CLASS}>
        Go to dashboard
      </Link>
      <button
        type="button"
        onClick={() => void session.logout()}
        disabled={session.pending}
        className={`${PORTAL_LINK_CLASS} disabled:opacity-60`}
      >
        {session.pending ? "Signing out…" : "Sign out"}
      </button>
    </>
  );
}

export function Header() {
  const pathname = usePathname();
  const session = useActivePortalSession();
  return (
    <header className="fixed top-0 z-30 w-full bg-white/75 backdrop-blur-md">
      <div className="mx-auto flex h-20 w-full max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold text-slate-900 sm:text-base"
        >
          <Image
            src="/images/logo.webp"
            alt="EasyLink Solar"
            priority
            unoptimized
            width={40}
            height={40}
          />
          <span>EASYLINK SOLAR</span>
        </Link>

        <nav className="hidden items-center gap-4 text-sm text-slate-800 lg:flex xl:gap-5">
          {LANDING_NAV_ITEMS.map((item, index) => (
            <Link
              key={index}
              href={item.link}
              className={`transition hover:text-cyan-700 ${pathname === item.link ? "text-secondary" : "text-slate-800"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex xl:gap-3">
          <div className="flex items-center gap-2 xl:gap-3">
            <button
              type="button"
              aria-label="Search"
              className="inline-flex size-9 items-center justify-center rounded-full text-slate-900 transition hover:bg-slate-900/10"
            >
              <Image src={searchIcon} alt="Search" width={16} height={16} />
            </button>
            <details className="relative">
              <summary
                aria-label={session ? `Account — signed in as ${session.user.firstName}` : "Account"}
                className="inline-flex size-9 cursor-pointer list-none items-center justify-center rounded-full text-slate-900 transition hover:bg-slate-900/10 marker:content-['']"
              >
                {session ? (
                  <span className="flex size-8 items-center justify-center rounded-full bg-linear-to-br from-yellow-lemon to-orange-amber text-xs font-bold text-warm-black">
                    {session.user.firstName.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <Image src={userIcon} alt="Account" width={16} height={16} />
                )}
              </summary>
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl">
                <AccountMenuContent session={session} />
              </div>
            </details>
            <CartButton />

            <RainbowButton
              href="/contact-us"
              shape="rounded"
              className="bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-50 xl:px-5"
            >
              Contact Us
            </RainbowButton>
            <Link
              href="/products"
              className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 xl:px-5"
            >
              Buy Now
            </Link>
          </div>
          <p className="hidden text-[11px] font-medium tracking-wide text-slate-800 2xl:block">
            Powered by{" "}
            <Link href="/bluetti" className="font-semibold text-cyan-600">
              BLUETTI
            </Link>
          </p>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <CartButton />
          <details className="relative">
            <summary
              aria-label={session ? `Account — signed in as ${session.user.firstName}` : "Account"}
              className="inline-flex size-9 cursor-pointer list-none items-center justify-center rounded-full text-slate-900 transition hover:bg-slate-900/10 marker:content-['']"
            >
              {session ? (
                <span className="flex size-8 items-center justify-center rounded-full bg-linear-to-br from-yellow-lemon to-orange-amber text-xs font-bold text-warm-black">
                  {session.user.firstName.charAt(0).toUpperCase()}
                </span>
              ) : (
                <Image src={userIcon} alt="Account" width={16} height={16} />
              )}
            </summary>
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl">
              <AccountMenuContent session={session} />
            </div>
          </details>

          <details className="relative">
          <summary className="cursor-pointer rounded-md border border-slate-400/40 px-3 py-2 text-xs font-semibold text-slate-900 marker:content-['']">
            Menu
          </summary>
          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl">
            <div className="mb-2 flex flex-col gap-2">
              {LANDING_NAV_ITEMS.map((item, index) => (
                <Link
                  key={index}
                  href={item.link}
                  className="rounded-md px-2 py-1 text-sm text-white/90 hover:bg-white/10"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="grid gap-2">
              <Link
                href="/contact-us"
                className="rounded-md border border-cyan-300/80 px-3 py-2 text-center text-xs font-semibold text-cyan-200"
              >
                Contact Us
              </Link>
              <Link href="/products" className="rounded-md bg-cyan-400 px-3 py-2 text-center text-xs font-semibold text-slate-950">
                Buy Now
              </Link>
            </div>
          </div>
          </details>
        </div>
      </div>
    </header>
  );
}
