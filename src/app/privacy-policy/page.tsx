import type { Metadata } from "next";
import Link from "next/link";
import { ContactLines, LEGAL_CONTACT, LegalDocument, List, P } from "@/components/pages/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Privacy policy | EasyLink Solar",
  description: "How EasyLink Solar collects, uses, shares and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title="Privacy policy"
      updated="9 November 2026"
      intro={
        <P>
          {LEGAL_CONTACT.business} (&ldquo;EasyLink&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) designs and supplies solar, battery and related energy systems, and connects customers with licensed installers. This policy explains how we handle your personal information under the Privacy Act 1988 (Cth) and the Australian Privacy Principles.
        </P>
      }
      sections={[
        {
          id: "collect",
          title: "What we collect",
          body: (
            <List
              items={[
                "Contact details: your name, email, mobile number and address.",
                "Your home and energy: your address and roof as seen in aerial and satellite imagery, the roof layout we design, and any power bill you upload (retailer, plan, usage and tariffs).",
                "Your designs, quotes, orders and payments, including the payment method you chose. We don't store full card numbers; our payment providers do.",
                "Your project: site details, photos, documents, certificates and installation records.",
                "Conversations: messages, emails, SMS, chats with EasyLink AI, and recordings and transcripts of phone calls with us.",
                "How you use our website and portals, such as pages visited and the device and browser you use.",
              ]}
            />
          ),
        },
        {
          id: "how",
          title: "How we collect it",
          body: (
            <>
              <P>Mostly from you: when you create a design or account, upload a bill, contact us, buy from us or use your portal. We also collect information from:</P>
              <List
                items={[
                  "mapping and imagery services, to see your roof;",
                  "the installer working on your job, who adds photos, documents and progress;",
                  "payment providers, who confirm your payment;",
                  "the people who referred you, if you were referred.",
                ]}
              />
            </>
          ),
        },
        {
          id: "use",
          title: "How we use it",
          body: (
            <List
              items={[
                "To design your system, prepare quotes and work out the rebates you may be eligible for.",
                "To supply products, arrange installation, apply for network approval and claim rebates on your behalf where you ask us to.",
                "To take payments, send receipts and keep records.",
                "To contact you about your design, quote, project, warranty and servicing by email, SMS and phone.",
                "To answer your questions, including through EasyLink AI.",
                "To improve our website, design tools and service, and to keep them secure.",
                "To send you marketing, only where you have agreed. You can opt out at any time using the unsubscribe link or by contacting us.",
              ]}
            />
          ),
        },
        {
          id: "ai",
          title: "AI, calls and recordings",
          body: (
            <>
              <P>
                We use artificial intelligence to read roofs and bills, prepare designs, answer questions and help our team. EasyLink AI may answer our phone line and chat on our website. You can always ask to speak to a person, and anything the AI arranges for you waits for your OK.
              </P>
              <P>
                We record and transcribe calls so we can follow up accurately and train our team. We keep sales call recordings for 12 months, and recordings connected to a contract for 7 years.
              </P>
            </>
          ),
        },
        {
          id: "share",
          title: "Who we share it with",
          body: (
            <>
              <P>We never sell your personal information. We share it only as needed to provide our service:</P>
              <List
                items={[
                  "the installer and licensed electricians assigned to your job, to quote, install and service your system;",
                  "your electricity network, for connection and export approval;",
                  "rebate agents and government bodies, to claim rebates and certificates you are eligible for;",
                  "payment providers such as Stripe, Afterpay and Zip, to process payments;",
                  "service providers who host and run our systems, send messages and calls, provide maps and imagery, provide AI services and measure how our website is used;",
                  "anyone you ask us to share it with, or where the law requires.",
                ]}
              />
              <P>Our service providers may only use your information to provide their services to us.</P>
            </>
          ),
        },
        {
          id: "overseas",
          title: "Overseas storage",
          body: (
            <P>
              Our main systems are hosted in Australia. Some of our service providers, such as analytics, mapping, messaging and AI providers, may store or process information outside Australia, including in the United States. We choose providers with appropriate security and privacy commitments.
            </P>
          ),
        },
        {
          id: "security",
          title: "Keeping it safe",
          body: (
            <P>
              We use access controls, encryption in transit, secure hosting and staff training to protect your information. We keep it only as long as we need it for the purposes above or as the law requires (for example, tax and warranty records), then delete or de-identify it.
            </P>
          ),
        },
        {
          id: "access",
          title: "Access, correction and deletion",
          body: (
            <>
              <P>
                You can ask for a copy of the information we hold about you, ask us to correct it, ask us to change who can see it, or ask us to delete it. Customers can do this from{" "}
                <Link href="/customers/privacy" className="font-semibold text-sky-700 underline">
                  My data and consent
                </Link>{" "}
                in the customer portal, or by contacting us. We respond within 30 days. If we can&apos;t do what you ask, for example because we must keep records by law, we&apos;ll tell you why.
              </P>
            </>
          ),
        },
        {
          id: "complaints",
          title: "Questions and complaints",
          body: (
            <>
              <P>Contact us first and we&apos;ll try to resolve your concern quickly:</P>
              <ContactLines />
              <P>
                If you&apos;re not satisfied with our response, you can contact the Office of the Australian Information Commissioner at{" "}
                <a href="https://www.oaic.gov.au" className="font-semibold text-sky-700 underline" rel="noopener noreferrer" target="_blank">
                  oaic.gov.au
                </a>{" "}
                or 1300 363 992.
              </P>
            </>
          ),
        },
        {
          id: "changes",
          title: "Changes to this policy",
          body: <P>We may update this policy from time to time. The latest version is always on this page, with the date it was last updated.</P>,
        },
      ]}
    />
  );
}
