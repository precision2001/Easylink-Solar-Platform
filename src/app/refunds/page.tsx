import type { Metadata } from "next";
import Link from "next/link";
import { ContactLines, LegalDocument, List, P } from "@/components/pages/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Refunds and cancellations | EasyLink Solar",
  description: "How cancellations, cooling-off periods, refunds and faulty products are handled at EasyLink Solar.",
};

export default function RefundsPage() {
  return (
    <LegalDocument
      title="Refunds and cancellations"
      updated="9 November 2026"
      intro={
        <P>
          This policy explains how to cancel an order and when you can get a refund. It works alongside our{" "}
          <Link href="/terms" className="font-semibold text-sky-700 underline">
            terms and conditions
          </Link>
          , and doesn&apos;t limit your rights under the Australian Consumer Law.
        </P>
      }
      sections={[
        {
          id: "cooling-off",
          title: "Cooling-off period",
          body: (
            <>
              <P>
                If you agreed to buy after we contacted you without you asking us to, for example by phone or at your door, the agreement is an unsolicited consumer agreement. You can cancel it within 10 business days of making it, for any reason and at no cost, and we will refund everything you have paid within 10 business days.
              </P>
              <P>No installation work will start during the cooling-off period unless the law allows it.</P>
            </>
          ),
        },
        {
          id: "cancel",
          title: "Cancelling a quote you've accepted",
          body: (
            <>
              <P>You can cancel before installation by contacting us. We will:</P>
              <List
                items={[
                  "refund your deposit and any other payments, less any reasonable costs we have already paid on your behalf that can't be recovered, such as equipment ordered specially for your system or network application fees;",
                  "show you each cost we deduct, with evidence, before we process the refund;",
                  "pay your refund within 10 business days of agreeing the amount, to the payment method you used.",
                ]}
              />
              <P>If we cancel, for example because your roof or network can&apos;t take the system, we refund everything you have paid.</P>
            </>
          ),
        },
        {
          id: "shop",
          title: "Products from our online shop",
          body: (
            <List
              items={[
                "If you change your mind about a product, contact us within 14 days of delivery. Unused products in their original packaging can usually be returned for a refund, less return shipping.",
                "Installed products, and products ordered specially for you, can't be returned for a change of mind.",
              ]}
            />
          ),
        },
        {
          id: "faulty",
          title: "Faulty products and installation problems",
          body: (
            <>
              <P>
                If a product or installation has a problem, contact us and we will arrange for it to be checked. Under the Australian Consumer Law you are entitled to a repair, replacement or refund depending on the problem, and to compensation for reasonably foreseeable loss. A major failure entitles you to choose a replacement or a refund.
              </P>
              <P>
                Manufacturer warranties apply in addition to these rights. See our{" "}
                <Link href="/warranty" className="font-semibold text-sky-700 underline">
                  warranty page
                </Link>
                .
              </P>
            </>
          ),
        },
        {
          id: "bnpl",
          title: "Afterpay and Zip",
          body: (
            <P>
              Refunds for purchases made with Afterpay or Zip are paid back to your Afterpay or Zip account, which adjusts your remaining instalments. The provider&apos;s own terms apply to your repayments.
            </P>
          ),
        },
        {
          id: "contact",
          title: "How to cancel or ask for a refund",
          body: (
            <>
              <P>Contact us with your name, address and quote or order number:</P>
              <ContactLines />
              <P>Customers can also message us from the customer portal.</P>
            </>
          ),
        },
      ]}
    />
  );
}
