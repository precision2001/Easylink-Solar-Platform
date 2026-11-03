import type { Metadata } from "next";
import { FooterSection } from "@/components/modules/LandingFooter";
import { Header } from "@/components/modules/LandingHero";
import { BluettiHeroSection } from "@/components/pages/bluetti/BluettiHeroSection";
import { BluettiProductComboSection } from "@/components/pages/bluetti/BluettiProductComboSection";
import { BluettiTechnologyPioneerSection } from "@/components/pages/bluetti/BluettiTechnologyPioneerSection";
import { BluettiSafetySection } from "@/components/pages/bluetti/BluettiSafetySection";
import { BluettiCinemaVideoSection } from "@/components/pages/bluetti/BluettiCinemaVideoSection";
import { BluettiSunBillsSection } from "@/components/pages/bluetti/BluettiSunBillsSection";
import { BluettiUseCaseTabsSection } from "@/components/pages/bluetti/BluettiUseCaseTabsSection";
import { BluettiAllInOneSection } from "@/components/pages/bluetti/BluettiAllInOneSection";
import { BluettiBackupCinemaSection } from "@/components/pages/bluetti/BluettiBackupCinemaSection";
import { BluettiAppCtaSection } from "@/components/pages/bluetti/BluettiAppCtaSection";

export const metadata: Metadata = {
  title: "BLUETTI EP2000 home battery | EasyLink Solar",
  description:
    "Explore the BLUETTI EP2000 home battery and its combos from EasyLink Solar, an authorised BLUETTI distributor.",
};

export default function BluettiPage() {
  return (
    <>
      <Header />
      <main className="overflow-x-hidden bg-white">
        <BluettiHeroSection />
        <BluettiProductComboSection />
        <BluettiTechnologyPioneerSection />
        <BluettiSafetySection />
        <BluettiCinemaVideoSection />
        <BluettiSunBillsSection />
        <BluettiUseCaseTabsSection />
        <BluettiAllInOneSection />
        <BluettiBackupCinemaSection />
        <BluettiAppCtaSection />
      </main>
      <FooterSection showReadyToControlCta={false} />
    </>
  );
}
