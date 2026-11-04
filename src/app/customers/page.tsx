import { FooterSection } from "@/components/modules/LandingFooter";
import { Header } from "@/components/modules/LandingHero";
import { CustomerPortalLanding } from "@/components/pages/customer/CustomerPortalLanding";

export const metadata = {
  title: "Customer portal | Easylink Solar",
  description:
    "Your solar, from design to switch-on, in one place: your design and savings, installation tracking, messages, payments and EasyLink AI.",
};

/** Public page (no session needed, see src/proxy.ts) explaining the customer portal. */
export default function CustomersLandingPage() {
  return (
    <>
      <Header />
      <main className="overflow-x-hidden">
        <CustomerPortalLanding />
      </main>
      <FooterSection showReadyToControlCta={false} />
    </>
  );
}
