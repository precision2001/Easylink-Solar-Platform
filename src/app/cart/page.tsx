import { Suspense } from "react";
import type { Metadata } from "next";
import { FooterSection } from "@/components/modules/LandingFooter";
import { Header } from "@/components/modules/LandingHero";
import { CartCheckoutPage } from "@/components/cart/CartCheckoutPage";

export const metadata: Metadata = { title: "Cart & checkout — EasyLink Solar" };

export default function CartPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen overflow-x-hidden bg-cream-50 pt-20">
        <Suspense fallback={null}>
          <CartCheckoutPage />
        </Suspense>
      </main>
      <FooterSection />
    </>
  );
}
