import type { Metadata } from "next";
import { FooterSection } from "@/components/modules/LandingFooter";
import { Header } from "@/components/modules/LandingHero";
import { AcrossAustraliaSection } from "@/components/pages/home/AcrossAustraliaSection";
import { BluettiProductsSection } from "@/components/pages/home/BluettiProductsSection";
import { CustomerReviewsSection } from "@/components/pages/home/CustomerReviewsSection";
import { HeroSection } from "@/components/pages/home/HeroSection";
import { PaymentOptionsSection } from "@/components/pages/home/PaymentOptionsSection";
import { PlatformSection } from "@/components/pages/home/PlatformSection";
import { ProductsSection } from "@/components/pages/home/ProductsSection";
import { SpecialDealsSection } from "@/components/pages/home/SpecialDealsSection";
import { TechnologySection } from "@/components/pages/home/TechnologySection";
import { VideoShowcaseSection } from "@/components/pages/home/VideoShowcaseSection";

export const metadata: Metadata = {
  title: "EasyLink Solar | Solar and battery systems across Australia",
  description:
    "Design your solar and battery system online, browse products and connect with solar installers across Australia with EasyLink Solar.",
};

export default function Home() {
  return (
    <>
      <Header />
      <main className="overflow-x-hidden bg-white">
        <HeroSection />
        <PlatformSection />
        <ProductsSection />
        <SpecialDealsSection />
        <BluettiProductsSection />
        <VideoShowcaseSection />
        <AcrossAustraliaSection />
        <TechnologySection />
        <CustomerReviewsSection />
        <PaymentOptionsSection />
      </main>
      <FooterSection />
    </>
  );
}
