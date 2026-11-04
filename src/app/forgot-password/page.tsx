import type { Metadata } from "next";
import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/pages/forgot-password/ForgotPasswordForm";
import { FooterSection } from "@/components/modules/LandingFooter";
import { Header } from "@/components/modules/LandingHero";

export const metadata: Metadata = {
  title: "Forgot password | EasyLink Solar",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <>
      <Header />
      <main className="flex min-h-screen items-center justify-center bg-solar-gold px-4 py-24">
        {/* ForgotPasswordForm reads ?role= via useSearchParams, which Next
            requires a Suspense boundary for during static rendering. */}
        <Suspense fallback={null}>
          <ForgotPasswordForm />
        </Suspense>
      </main>
      <FooterSection showReadyToControlCta={false} />
    </>
  );
}
