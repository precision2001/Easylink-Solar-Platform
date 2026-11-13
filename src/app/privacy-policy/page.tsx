import type { Metadata } from "next";
import Link from "next/link";
import { ContactLines, H3, LEGAL_CONTACT, LegalDocument, List, P } from "@/components/pages/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Privacy policy | EasyLink Solar",
  description: "How EasyLink Solar collects, uses, shares and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title="Privacy policy"
      updated="13 November 2026"
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
                "How you use our website and portals: pages visited, buttons and links clicked, which forms you submit (the names of the fields, never what you type), errors you run into, and the device and browser you use.",
                "Your calling and marketing choices: what you have agreed to, when, and any request not to be contacted.",
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
                  "the people who referred you, if you were referred;",
                  "contact lists we obtain from other organisations, where the people on them have agreed to be contacted.",
                ]}
              />
              <P>
                Our website and portals also record how they are used: page views, clicks on buttons and links, form submissions (field names only) and errors, linked to a visitor cookie and, once you sign in or save a design, to your record. This is not recorded if your browser sends a Do Not Track or Global Privacy Control signal. Microsoft Clarity separately records how pages are used; see our{" "}
                <Link href="/cookies" className="font-semibold text-sky-700 underline">
                  cookie policy
                </Link>
                .
              </P>
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
          title: "AI and automated decisions",
          body: (
            <>
              <P>
                EasyLink uses artificial intelligence and other computer programs across our website, portals and phone line. This section explains what they do, what information they use and which decisions they make or help make. You can always ask to speak to a person, and you can ask a person to review any outcome below.
              </P>
              <H3>Where we use AI</H3>
              <List
                items={[
                  <><b>Roof and system design.</b> When you enter an address, our Roof Designer reads satellite and street imagery of the roof, with an AI model and mapping data, to find the roof faces and lay out panels. It uses your address and the imagery of your property.</>,
                  <><b>Bills and savings.</b> If you upload a power bill, a program reads your retailer, plan, usage and tariffs to size a system and estimate savings.</>,
                  <><b>Prices, quotes and rebates.</b> Our pricing engine works out indicative prices, the system options you are shown, and the rebates and certificates (such as STCs and battery rebates) that appear to apply. It uses your address, design, chosen products and payment method.</>,
                  <><b>EasyLink AI on the phone, in chat and in your portal.</b> EasyLink AI may answer calls and messages, answer questions, take your enquiry, give indicative price ranges, book or move a site visit, arrange a call back and log a service issue. It uses what you tell it and your record with us (contact details, enquiry, job stage and bookings). It tells you it is an AI and that calls are recorded.</>,
                  <><b>Call recording and analysis.</b> Calls are recorded and transcribed. Programs summarise each call, sort it by topic (for example new enquiry, battery interest, price question, complaint or safety issue), assess sentiment and suggest the next step for our team. Card, bank and identity numbers are redacted from transcripts.</>,
                  <><b>Records, photos and documents.</b> AI summarises your project record, labels photos and documents, and may ask for anything missing.</>,
                  <><b>Activity on our website and portals.</b> We record interaction events (see &ldquo;How we collect it&rdquo;) so our team and our AI can follow up at a useful time and so we can find and fix problems.</>,
                ]}
              />
              <H3>Decisions made by computer programs alone</H3>
              <List
                items={[
                  "The roof layout, system options, indicative prices and estimated savings and rebates shown to you in the design platform, and indicative price ranges given by EasyLink AI. These are estimates. A final quote is confirmed by a person.",
                  "Site visit, call back and service bookings made by EasyLink AI, and which installer or staff member they are given to, under rules our team sets.",
                  "Whether and when we may phone you: our systems check the Do Not Call Register, your consent, any request not to be called, and permitted calling hours for your location before a call is placed.",
                  "Routing of calls and messages to the right team, and urgent alerts to staff when a call mentions a complaint or a safety issue.",
                  "Reminders about designs, quotes, appointments and payments, sent by email or SMS.",
                ]}
              />
              <H3>Decisions a program helps a person make</H3>
              <List
                items={[
                  "Your final quote: the pricing engine prepares it, and our staff or your installer can review and change it.",
                  "Which rebates and certificates are claimed for your system.",
                  "How and when our team follows up your enquiry, using call summaries, topics and suggested next steps.",
                  "Which installer is offered your job. EasyLink decides, and may use a program to suggest a match based on your location, the system and installer availability.",
                ]}
              />
              <P>
                The personal information these programs use is: your contact details; your address, roof imagery and design; your bill and energy use; your quotes, orders, payments and job records; your calls, messages and their transcripts; your activity on our website and portals; and your contact and marketing choices. We do not use AI to decide whether to give you credit; if you pay with Afterpay or Zip, they make their own assessment.
              </P>
              <P>
                We keep a record of what our AI decided and why, so a person can check it. We keep sales call recordings for 12 months, and recordings connected to a contract for 7 years.
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
          title: "Where your information is stored",
          body: (
            <>
              <P>
                Our website, portals, database, call recordings and phone system are hosted in Australia (Amazon Web Services, Sydney). The AI models that read roofs and bills, summarise records and run EasyLink AI on our phone line run on Amazon Web Services in Australia.
              </P>
              <P>Some service providers may store or process information outside Australia, mainly in the United States:</P>
              <List
                items={[
                  "xAI, which powers the question-and-answer chat on our website (the questions you type);",
                  "Deepgram and LiveKit, for calls and call transcription made through our dialler;",
                  "Google, for maps, address lookup, roof imagery and Google sign-in (your address and location on the map);",
                  "Microsoft Clarity, for website analytics;",
                  "Resend, for sending email;",
                  "Stripe, Afterpay and Zip, for payments.",
                ]}
              />
              <P>We choose providers with appropriate security and privacy commitments, and they may only use your information to provide their services to us.</P>
            </>
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
