import type { Metadata } from "next";
import { ReadingColumnLayout } from "@/components/layouts/ReadingColumnLayout";
import { FooterSection } from "@/components/modules/LandingFooter";
import { Header } from "@/components/modules/LandingHero";
import { WarrantyPageSection } from "@/components/pages/warranty/WarrantyPageSection";

export const metadata: Metadata = {
  title: "Warranty | EasyLink Solar",
  description:
    "Warranty information for solar and battery systems supplied by EasyLink Solar.",
};

export default function WarrantyPage() {
  return (
    <>
      <Header />
      <main>
        <ReadingColumnLayout backgroundClassName="bg-warranty-page-bg">
          <WarrantyPageSection />
        </ReadingColumnLayout>
      </main>
      <FooterSection />
    </>
  );
}
