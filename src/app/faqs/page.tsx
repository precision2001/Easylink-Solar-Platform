import type { Metadata } from "next";
import { FooterSection } from "@/components/modules/LandingFooter";
import { Header } from "@/components/modules/LandingHero";
import { FaqsPageSection } from "@/components/pages/faqs/FaqsPageSection";
import { FAQS_PAGE } from "@/utils/constant";

export const metadata: Metadata = {
  title: "FAQs | EasyLink Solar",
  description:
    "Answers to common questions about solar systems, batteries, products, installation and rebates.",
};

export default function FaqsPage() {
  return (
    <>
      <Header />
      <main className="overflow-x-hidden bg-faqs-page-bg">
        <FaqsPageSection />
      </main>
      <FooterSection
        showReadyToControlCta={false}
        customCta={FAQS_PAGE.supportCta}
      />
    </>
  );
}
