import { Suspense } from "react";
import { FooterSection } from "@/components/modules/LandingFooter";
import { Header } from "@/components/modules/LandingHero";
import { PortalLinkStatus } from "@/components/pages/portal-link/PortalLinkStatus";

export const metadata = {
  title: "Open your portal | Easylink Solar",
  robots: { index: false, follow: false },
};

/**
 * Landing page for emailed one-time portal links. Sits outside /customers/*
 * so the portal's sign-in guard (src/proxy.ts) doesn't bounce it.
 */
export default function PortalLinkPage() {
  return (
    <>
      <Header />
      <main className="flex min-h-screen items-center justify-center bg-solar-gold px-4 py-24">
        <Suspense fallback={null}>
          <PortalLinkStatus />
        </Suspense>
      </main>
      <FooterSection showReadyToControlCta={false} />
    </>
  );
}
