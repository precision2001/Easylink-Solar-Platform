import type { Metadata } from "next";
import { BusinessAssociatesSection } from "@/components/pages/contact/BusinessAssociatesSection";
import { DesignSystemSection } from "@/components/pages/contact/DesignSystemSection";
import { FooterSection } from "@/components/modules/LandingFooter";
import { HeroSection } from "@/components/pages/contact/HeroSection";
import { SendUsAndPartnerSection } from "@/components/pages/contact/SendUsAndPartnerSection";

export const metadata: Metadata = {
  title: "Contact us | EasyLink Solar",
  description:
    "Get in touch with the EasyLink Solar team about solar, battery and home energy systems.",
};

export default function ContactUsPage() {
  return (
    <main className="min-h-screen bg-solar-gold">
      <HeroSection />
      <SendUsAndPartnerSection />
      <BusinessAssociatesSection />
      <DesignSystemSection />
      <FooterSection />
    </main>
  );
}
