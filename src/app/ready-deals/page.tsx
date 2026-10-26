import type { Metadata } from "next";
import { FooterSection } from "@/components/modules/LandingFooter";
import { Header } from "@/components/modules/LandingHero";
import { ReadyDealsBrowser } from "@/components/market/ReadyDealsBrowser";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://easylinksolar.com.au";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Ready Deals: solar and battery deals from local installers | EasyLink Solar",
  description: "Fixed-price solar, battery and bundle deals from accredited installers near you, approved by EasyLink. Pay 50% to buy and 50% before installation.",
  alternates: { canonical: "/ready-deals" },
  openGraph: { type: "website", url: "/ready-deals", siteName: "EasyLink Solar", locale: "en_AU", title: "Ready Deals from local installers" },
};

export default function ReadyDealsPage() {
  return (
    <>
      <Header />
      <main className="bg-[#F8FAFC]">
        <section className="mx-auto flex max-w-[1180px] flex-col gap-3 px-4 pb-6 pt-28 md:px-6">
          <p className="m-0 text-[13px] font-bold uppercase tracking-[0.08em] text-[#0B4A7A]">Ready Deals</p>
          <h1 className="m-0 font-source-sans text-[34px] font-bold leading-tight text-[#0F172A] md:text-[44px]">Fixed-price deals from installers near you</h1>
          <p className="m-0 max-w-[760px] text-[17px] leading-relaxed text-[#334155]">
            Solar, batteries and bundles at a set price, installed by accredited local installers and approved by EasyLink. Enter your postcode to see who works in your area.
          </p>
        </section>
        <ReadyDealsBrowser />
      </main>
      <FooterSection />
    </>
  );
}
