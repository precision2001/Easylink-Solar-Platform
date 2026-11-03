import type { Metadata } from "next";
import Link from "next/link";
import { FooterSection } from "@/components/modules/LandingFooter";
import { Header } from "@/components/modules/LandingHero";
import { DealCheckout } from "@/components/market/DealCheckout";

export const metadata: Metadata = {
  title: "Buy a Ready Deal | EasyLink Solar",
  robots: { index: false },
};

export default async function ReadyDealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <Header />
      <main className="bg-[#F8FAFC]">
        <div className="mx-auto max-w-[1080px] px-4 pb-4 pt-28 md:px-6">
          <Link href="/ready-deals" className="text-[14px] font-semibold text-[#0B4A7A] hover:underline">
            ← All Ready Deals
          </Link>
        </div>
        <DealCheckout id={id} />
      </main>
      <FooterSection />
    </>
  );
}
