import Link from "next/link";
import { Suspense } from "react";
import { BrandLink, TEXT_LINK } from "@/components/customer/auth/AuthBits";
import { PortalLinkStatus } from "@/components/pages/portal-link/PortalLinkStatus";

export const metadata = {
  title: "Open your portal | Easylink Solar",
  robots: { index: false, follow: false },
};

/**
 * Landing page for emailed one-time portal links. Sits outside /customers/*
 * so the portal's sign-in guard (src/proxy.ts) doesn't bounce it.
 */
export default function PortalLinkPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6FA] font-inter text-[#0F172A]">
      <header className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-4 py-2 sm:px-6">
          <BrandLink tone="light" compact />
          <Link href="/customers" className={TEXT_LINK}>
            About the portal
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center sm:py-16">
        <Suspense fallback={null}>
          <PortalLinkStatus />
        </Suspense>
      </main>
      <footer className="px-4 pb-8 text-center text-[13px] text-[#5B6B80]">
        Trouble signing in?{" "}
        <Link href="/contact-us" className="inline-flex min-h-[44px] items-center font-semibold text-[#1D4ED8] underline-offset-4 hover:underline">
          Contact EasyLink
        </Link>
      </footer>
    </div>
  );
}
