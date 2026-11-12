import type { Metadata } from "next";
import Link from "next/link";
import { ContactLines, LegalDocument, List, P } from "@/components/pages/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Cookie policy | EasyLink Solar",
  description: "The cookies and similar technologies the EasyLink Solar website uses, and how to control them.",
};

export default function CookiesPage() {
  return (
    <LegalDocument
      title="Cookie policy"
      updated="9 November 2026"
      intro={<P>Cookies are small files a website saves in your browser. We also use similar browser storage. This page explains what we use and why.</P>}
      sections={[
        {
          id: "essential",
          title: "Essential",
          body: (
            <>
              <P>Needed for the website to work. They can&apos;t be switched off in our site, because sign-in, your cart and your designs wouldn&apos;t work without them.</P>
              <List items={["Keeping you signed in to your portal, securely.", "Remembering your cart and checkout.", "Saving your progress in the design platform.", "Protecting forms and accounts from misuse."]} />
            </>
          ),
        },
        {
          id: "analytics",
          title: "Analytics",
          body: (
            <P>
              We use Microsoft Clarity to understand how people use our website, such as which pages are visited, where people click and where they get stuck, so we can improve it. We set Clarity to hide sensitive fields, and card details are entered on our payment providers&apos; secure forms, which Clarity can&apos;t see. Microsoft may process this information outside Australia.
            </P>
          ),
        },
        {
          id: "advertising",
          title: "Advertising",
          body: <P>We don&apos;t use advertising or cross-site tracking cookies.</P>,
        },
        {
          id: "control",
          title: "Controlling cookies",
          body: (
            <P>
              You can block or delete cookies in your browser settings. If you block essential cookies, sign-in, the cart and the design platform won&apos;t work properly.
            </P>
          ),
        },
        {
          id: "more",
          title: "More information",
          body: (
            <>
              <P>
                Our{" "}
                <Link href="/privacy-policy" className="font-semibold text-sky-700 underline">
                  privacy policy
                </Link>{" "}
                explains how we handle personal information. Questions:
              </P>
              <ContactLines />
            </>
          ),
        },
      ]}
    />
  );
}
