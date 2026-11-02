import { Suspense } from "react";
import type { Metadata } from "next";
import { FooterSection } from "@/components/modules/LandingFooter";
import { Header } from "@/components/modules/LandingHero";
import { CheckoutComplete } from "@/components/cart/CheckoutComplete";

export const metadata: Metadata = { title: "Order confirmed — EasyLink Solar" };

export default function CheckoutCompletePage() {
  return (
    <>
      <Header />
      <main className="min-h-screen overflow-x-hidden bg-cream-50 pt-20">
        <Suspense fallback={null}>
          <CheckoutComplete />
        </Suspense>
      </main>
      <FooterSection />
    </>
  );
}
