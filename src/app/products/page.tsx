import type { Metadata } from "next";
import { ProductsPageSection } from "@/components/pages/products/ProductsPageSection";
import { FooterSection } from "@/components/modules/LandingFooter";
import { Header } from "@/components/modules/LandingHero";

export const metadata: Metadata = {
  title: "Products | EasyLink Solar",
  description:
    "Browse solar panels, inverters, batteries, EV chargers, heat pumps and portable power available through EasyLink Solar.",
};

export default function ProductsPage() {
  return (
    <>
      <Header />
      <main className="overflow-x-hidden bg-white">
        <ProductsPageSection />
      </main>
      <FooterSection />
    </>
  );
}
