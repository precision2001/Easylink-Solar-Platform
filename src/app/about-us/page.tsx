import type { Metadata } from "next";
import { AboutUsPageSection } from "@/components/pages/about-us/AboutUsPageSection";
import { FooterSection } from "@/components/modules/LandingFooter";
import { Header } from "@/components/modules/LandingHero";

export const metadata: Metadata = {
  title: "About us | EasyLink Solar",
  description:
    "Learn about EasyLink Solar, the Australian solar platform connecting customers and installers.",
};

export default function AboutUsPage() {
  return (
    <>
      <Header />
      <main className="overflow-x-hidden bg-white">
        <AboutUsPageSection />
      </main>
      <FooterSection />
    </>
  );
}
