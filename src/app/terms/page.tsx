import type { Metadata } from "next";
import Link from "next/link";
import { ContactLines, LEGAL_CONTACT, LegalDocument, List, P } from "@/components/pages/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Terms and conditions | EasyLink Solar",
  description: "Terms for using the EasyLink Solar website, design platform and portals, and for quotes, purchases and installations.",
};

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms and conditions"
      updated="9 November 2026"
      intro={
        <>
          <P>
            These terms apply when you use the EasyLink Solar website, design platform and portals, and when you accept a quote or buy from {LEGAL_CONTACT.business} (&ldquo;EasyLink&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;).
          </P>
          <P>
            Nothing in these terms excludes, restricts or changes your rights under the Australian Consumer Law. Where these terms and the Australian Consumer Law differ, the Australian Consumer Law applies.
          </P>
        </>
      }
      sections={[
        {
          id: "website",
          title: "Using our website and portals",
          body: (
            <List
              items={[
                "Keep your account details secure, and tell us if you think someone else has used your account.",
                "Give us accurate information. Designs and quotes depend on your address, roof, power bill and the answers you give.",
                "Don't misuse the website, try to access accounts or data that aren't yours, or copy our content or tools for commercial use.",
                "We may change, suspend or stop parts of the website, and will try to give notice where a change affects you.",
              ]}
            />
          ),
        },
        {
          id: "designs",
          title: "Designs, estimates and AI",
          body: (
            <>
              <P>
                Designs, savings, payback and rebate figures shown on our website and design platform are estimates. They are based on imagery, typical weather, the information you give us and stated assumptions, and are not a quote or a guarantee of future savings. Your actual results depend on your usage, tariffs, export limits, shading, weather and other factors.
              </P>
              <P>
                Some answers and designs are prepared with the help of AI. A person reviews your system before it is installed, and anything EasyLink AI arranges for you waits for your confirmation.
              </P>
            </>
          ),
        },
        {
          id: "quotes",
          title: "Quotes",
          body: (
            <List
              items={[
                "A quote sets out the products, works, price, rebates applied and deposit for your system, and is valid until the date shown on it.",
                "Prices include GST unless the quote says otherwise.",
                "Rebates applied to a quote depend on your eligibility and the date your system is installed. If a rebate changes or you turn out not to be eligible, we will tell you the effect on your price before installation.",
                "A site visit may find conditions the quote didn't allow for, such as a switchboard or phase upgrade. We will give you a revised price, and you can choose whether to go ahead before any extra work is done.",
                "You accept a quote by agreeing to these terms in your portal or by signing it. A contract is formed when you accept and pay any deposit due.",
              ]}
            />
          ),
        },
        {
          id: "payment",
          title: "Deposits and payment",
          body: (
            <List
              items={[
                "The deposit is shown on your quote. Unless your quote says otherwise, it is 25% of the total, and the balance is due before installation.",
                "Ready Deals are paid 50% when you accept and 50% before installation starts.",
                "You can pay by card, or with Afterpay or Zip where your total is eligible. Prices paid with Afterpay or Zip are higher than card prices, and the amount is shown before you pay. Afterpay and Zip are provided under their own terms.",
                "Products bought from our online shop are paid for in full at checkout.",
              ]}
            />
          ),
        },
        {
          id: "installation",
          title: "Installation",
          body: (
            <>
              <P>
                Installation and electrical work are carried out by licensed electricians and Solar Accreditation Australia accredited installers engaged for your job. We arrange and coordinate the work, keep you updated in your portal, and remain your point of contact.
              </P>
              <List
                items={[
                  "Installation dates depend on network approval, product availability, weather and safe access to your roof.",
                  "Please give safe access to your property and switchboard, and tell us about anything that may affect the work, such as asbestos, roof damage or pets.",
                  "Your system must be approved by your electricity network before it is switched on and before it exports power.",
                ]}
              />
            </>
          ),
        },
        {
          id: "ownership",
          title: "Ownership and risk",
          body: (
            <P>
              Products become yours once they are paid for in full. Risk in products passes to you when they are delivered to your property or installed, whichever comes first.
            </P>
          ),
        },
        {
          id: "warranties",
          title: "Warranties and consumer guarantees",
          body: (
            <>
              <P>
                Our goods come with guarantees that cannot be excluded under the Australian Consumer Law. You are entitled to a replacement or refund for a major failure and compensation for any other reasonably foreseeable loss or damage. You are also entitled to have the goods repaired or replaced if the goods fail to be of acceptable quality and the failure does not amount to a major failure.
              </P>
              <P>
                Products also carry their manufacturers&apos; warranties, and installation workmanship is covered as set out on our{" "}
                <Link href="/warranty" className="font-semibold text-sky-700 underline">
                  warranty page
                </Link>
                . We keep your warranty documents in your portal.
              </P>
            </>
          ),
        },
        {
          id: "refunds",
          title: "Cancellations and refunds",
          body: (
            <P>
              See our{" "}
              <Link href="/refunds" className="font-semibold text-sky-700 underline">
                refunds and cancellations policy
              </Link>
              , including your cooling-off rights.
            </P>
          ),
        },
        {
          id: "liability",
          title: "Our liability",
          body: (
            <P>
              To the extent the law allows, and except for your rights under the Australian Consumer Law, we are not liable for indirect or consequential loss, or for loss caused by events outside our reasonable control. Where our liability for goods or services not ordinarily acquired for personal, domestic or household use can be limited, it is limited to resupplying the goods or services or paying the cost of doing so.
            </P>
          ),
        },
        {
          id: "privacy",
          title: "Privacy",
          body: (
            <P>
              We handle your personal information as set out in our{" "}
              <Link href="/privacy-policy" className="font-semibold text-sky-700 underline">
                privacy policy
              </Link>
              .
            </P>
          ),
        },
        {
          id: "general",
          title: "General",
          body: (
            <>
              <P>These terms are governed by the laws of New South Wales. We may update them from time to time; the version that applied when you accepted your quote continues to apply to that quote.</P>
              <P>Questions about these terms:</P>
              <ContactLines />
            </>
          ),
        },
      ]}
    />
  );
}
