import type { Metadata } from "next";
import { Suspense } from "react";
import { FooterSection } from "@/components/modules/LandingFooter";
import { Header } from "@/components/modules/LandingHero";
import { VerifyEmailStatus } from "@/components/pages/verify-email/VerifyEmailStatus";

export const metadata: Metadata = {
  title: "Verify email | EasyLink Solar",
  robots: { index: false, follow: false },
};

export default function VerifyEmailPage() {
  return (
    <>
      <Header />
      <main className="flex min-h-screen items-center justify-center bg-solar-gold px-4 py-24">
        <Suspense fallback={null}>
          <VerifyEmailStatus />
        </Suspense>
      </main>
      <FooterSection showReadyToControlCta={false} />
    </>
  );
}
