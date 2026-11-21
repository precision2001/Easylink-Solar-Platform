import { ServicesBenefitsSection } from "@/components/pages/services/ServicesBenefitsSection";
import { ServicesFaqSection } from "@/components/pages/services/ServicesFaqSection";
import { ServicesFinalCtaSection } from "@/components/pages/services/ServicesFinalCtaSection";
import { ServicesHeroSection } from "@/components/pages/services/ServicesHeroSection";
import { ServicesOfferingsSection } from "@/components/pages/services/ServicesOfferingsSection";
import { ServicesPortfolioSection } from "@/components/pages/services/ServicesPortfolioSection";
import { ServicesPricingSection } from "@/components/pages/services/ServicesPricingSection";
import { ServicesProcessSection } from "@/components/pages/services/ServicesProcessSection";
import { ServicesTechStackSection } from "@/components/pages/services/ServicesTechStackSection";
import { ServicesWhyChooseSection } from "@/components/pages/services/ServicesWhyChooseSection";

export function ServicesPageSection() {
  return (
    <>
      <ServicesHeroSection />
      <ServicesOfferingsSection />
      <ServicesWhyChooseSection />
      <ServicesProcessSection />
      <ServicesPortfolioSection />
      <ServicesTechStackSection />
      <ServicesBenefitsSection />
      <ServicesPricingSection />
      <ServicesFaqSection />
      <ServicesFinalCtaSection />
    </>
  );
}
