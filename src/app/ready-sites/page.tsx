import type { Metadata } from "next";
import Link from "next/link";
import { FooterSection } from "@/components/modules/LandingFooter";
import { Header } from "@/components/modules/LandingHero";
import { PublicReadySites } from "@/components/market/PublicReadySites";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://easylinksolar.com.au";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Ready Sites for installers | EasyLink Solar",
  description: "Customers ready to install, with payment or installation already confirmed. Accredited installers buy Ready Sites in the EasyLink installer portal.",
  alternates: { canonical: "/ready-sites" },
  openGraph: { type: "website", url: "/ready-sites", siteName: "EasyLink Solar", locale: "en_AU", title: "Ready Sites for installers" },
};

export default function ReadySitesPage() {
  return (
    <>
      <Header />
      <main className="bg-[#F8FAFC]">
        <section className="mx-auto flex max-w-[1080px] flex-col gap-3 px-4 pb-6 pt-28 md:px-6">
          <p className="m-0 text-[13px] font-bold uppercase tracking-[0.08em] text-[#0B4A7A]">For installers</p>
          <h1 className="m-0 font-source-sans text-[34px] font-bold leading-tight text-[#0F172A] md:text-[44px]">Ready Sites: customers ready to install</h1>
          <p className="m-0 max-w-[760px] text-[17px] leading-relaxed text-[#334155]">
            Each site has its system agreed and payment or installation already confirmed. Buy one in the installer portal and the customer, deposit and documents move straight into your jobs. The first installer to buy gets it.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href="/installers/auth" className="rounded-[10px] bg-[#0B4A7A] px-5 py-3 text-[15px] font-semibold text-white hover:bg-[#093d65]">
              Installer sign in
            </Link>
            <Link href="/contact-us" className="rounded-[10px] border border-[#CBD5E1] bg-white px-5 py-3 text-[15px] font-semibold text-[#0F172A] hover:border-[#94A3B8]">
              Become an EasyLink installer
            </Link>
          </div>
        </section>
        <PublicReadySites />
      </main>
      <FooterSection />
    </>
  );
}
