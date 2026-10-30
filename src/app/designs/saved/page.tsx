import Link from "next/link";
import { FooterSection } from "@/components/modules/LandingFooter";
import { Header } from "@/components/modules/LandingHero";
import Icon from "@/components/ui/Icons";
import { AuthCard } from "@/components/ui/auth/AuthCard";

export const metadata = {
  title: "Design saved | EasyLink Solar",
  robots: { index: false, follow: false },
};

/** Where a signed-out visitor lands after Finish saves their design. */
export default function DesignSavedPage() {
  return (
    <>
      <Header />
      <main className="flex min-h-screen items-center justify-center bg-solar-gold px-4 py-24">
        <AuthCard className="w-full max-w-[440px] p-[3px]">
          <div className="flex flex-col items-center gap-4 rounded-[21px] bg-white px-8 py-10 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-mint-soft">
              <Icon name="CheckCircle" className="size-7 text-success" />
            </span>
            <h1 className="font-inter text-xl font-bold text-warm-ink">Your design is saved</h1>
            <p className="font-dm-sans text-sm text-warm-gray">
              We&apos;ve emailed a link to your portal to the address you entered. Open it to
              view your design, change options and book a free site visit.
            </p>
            <p className="font-dm-sans text-xs text-warm-gray">
              Can&apos;t see it? Check your spam folder, or request a new link from the sign-in
              page.
            </p>
            <Link
              href="/customers/auth"
              className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-xl border-2 border-warm-ink/20 px-6 font-inter text-sm font-bold text-warm-ink hover:bg-cream-50"
            >
              Go to sign in
            </Link>
          </div>
        </AuthCard>
      </main>
      <FooterSection showReadyToControlCta={false} />
    </>
  );
}
