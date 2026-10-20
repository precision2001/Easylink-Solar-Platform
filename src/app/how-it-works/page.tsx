import type { Metadata } from "next";
import Link from "next/link";
import { FooterSection } from "@/components/modules/LandingFooter";
import { Header } from "@/components/modules/LandingHero";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://easylinksolar.com.au";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "How your solar installation works | EasyLink Solar",
  description: "From your design to switch-on: how EasyLink Solar matches an accredited installer, handles network approval, STCs and paperwork, and watches your system for its first three days.",
  alternates: { canonical: "/how-it-works" },
  openGraph: { type: "website", url: "/how-it-works", siteName: "EasyLink Solar", locale: "en_AU", title: "How your solar installation works" },
};

const STEPS: { title: string; body: string; you: string }[] = [
  { title: "Design your system", body: "Enter your address in the Design Platform. You get four options: solar only, two battery sizes and a design of your own, each with output, savings and the price after the STC discount.", you: "Pick a design and your equipment." },
  { title: "Get matched with an installer", body: "We offer your job to the closest highly rated installer with current Solar Accreditation Australia accreditation (and a battery endorsement if you chose a battery).", you: "Nothing. We'll tell you who it is." },
  { title: "Confirm and send photos", body: "Confirm your selection by voice with EasyLink AI or with one tap, and send photos of your meter and switchboard so your installer can check the site.", you: "Confirm, send 2–4 photos, sign your agreement with a code we text you." },
  { title: "Deposit and dates", body: "Your installer sends a tax invoice for the deposit. Pay online, then choose two installation days from the dates offered.", you: "Pay the deposit, pick your dates." },
  { title: "Network approval", body: "Your installer applies to your electricity distributor (for example Ausgrid, Endeavour Energy or Essential Energy) before installation. Approval usually takes 5–10 business days.", you: "Nothing. You'll see when it's approved." },
  { title: "Bills, order and delivery", body: "Upload a recent energy bill so we can size the battery and savings on your real usage. Your equipment is ordered from the EasyLink warehouse and delivered the day before installation.", you: "Upload a bill; accept any change to your quote." },
  { title: "Installation day", body: "Your installer checks in when they arrive, photographs every step, scans each serial number and tests the system. You'll be shown how to shut it down safely.", you: "Sign “Installation complete” on the installer's phone." },
  { title: "Paperwork, done for you", body: "Your certificate of compliance goes to you and your electricity retailer for the meter change. You pay the final invoice, sign your STC form, and receive your warranties, manuals and certificates in one handover pack.", you: "Pay the final invoice, sign the STC form." },
  { title: "Three days of watching", body: "For the first three days we compare your system's output with what it should make for the weather, and fix anything before you'd notice.", you: "Nothing. See the daily figures in My Project." },
];

export default function HowItWorksPage() {
  return (
    <>
      <Header />
      <main className="bg-white">
        <section className="mx-auto flex max-w-[1080px] flex-col gap-3 px-4 pb-6 pt-28 md:px-6">
          <p className="m-0 text-[13px] font-bold uppercase tracking-[0.08em] text-[#0B4A7A]">How it works</p>
          <h1 className="m-0 font-source-sans text-[34px] font-bold leading-tight text-[#0F172A] md:text-[44px]">From your design to switch-on, in nine steps</h1>
          <p className="m-0 max-w-[720px] text-[17px] leading-relaxed text-[#334155]">Every step shows in your portal as it happens: what&apos;s done, what&apos;s next, and who it&apos;s waiting on. You only ever do the parts that need you.</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/designs" className="rounded-[10px] bg-[#0B4A7A] px-5 py-3 text-[15px] font-semibold text-white hover:bg-[#093d65]">
              Start my design
            </Link>
            <Link href="/contact-us" className="rounded-[10px] border border-[#CBD5E1] px-5 py-3 text-[15px] font-semibold text-[#0F172A] hover:border-[#94A3B8]">
              Talk to us
            </Link>
          </div>
        </section>
        <ol className="mx-auto grid max-w-[1080px] list-none grid-cols-1 gap-4 px-4 pb-16 md:grid-cols-3 md:px-6">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-2 rounded-[16px] border border-[#E3E8EF] p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF7FE] text-[14px] font-bold text-[#0B4A7A]">{i + 1}</span>
              <h2 className="m-0 font-source-sans text-[19px] font-bold text-[#0F172A]">{s.title}</h2>
              <p className="m-0 text-[14.5px] leading-relaxed text-[#334155]">{s.body}</p>
              <p className="m-0 mt-auto rounded-[10px] bg-[#F8FAFC] px-3 py-2 text-[13.5px] text-[#0F172A]">
                <strong>What you do:</strong> {s.you}
              </p>
            </li>
          ))}
        </ol>
        <section className="mx-auto max-w-[1080px] px-4 pb-20 md:px-6">
          <div className="rounded-[16px] bg-[#0B2540] p-6 text-white md:p-8">
            <h2 className="m-0 font-source-sans text-[22px] font-bold">About STCs</h2>
            <p className="m-0 mt-2 max-w-[760px] text-[15px] leading-relaxed text-white/85">
              Small-scale technology certificates (STCs) are created for eligible solar and battery systems under the federal Small-scale Renewable Energy Scheme. You assign them when you sign your STC form, and their value comes off your price up front. The number depends on your system size, your postcode&apos;s zone and the installation date; your quote shows the estimate and your STC form shows the final count.
            </p>
          </div>
        </section>
      </main>
      <FooterSection showReadyToControlCta={false} />
    </>
  );
}
