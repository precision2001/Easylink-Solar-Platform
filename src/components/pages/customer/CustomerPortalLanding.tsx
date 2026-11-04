"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { askEasylinkAi } from "@/components/ai-chat/EasylinkAiChatbot";
import { PortalIcon, type PortalIconName } from "@/components/customer/portal/PortalIcon";
import { SunMotif } from "@/components/customer/auth/AuthBits";

/**
 * Public page for signed-out visitors that explains the customer portal.
 * Every claim here describes a screen that exists in the portal; no numbers,
 * ratings or testimonials.
 */

const FEATURES: { icon: PortalIconName; title: string; body: string; where: string }[] = [
  {
    icon: "design",
    title: "Your design and savings",
    body: "See your panel layout, battery and price after rebates, with estimated yearly savings. Compare system options and switch before you approve.",
    where: "My design",
  },
  {
    icon: "project",
    title: "Track your installation",
    body: "Follow each step from site visit to switch-on. We update it as your job moves and tell you what happens next.",
    where: "My project",
  },
  {
    icon: "messages",
    title: "Message your installer",
    body: "Message EasyLink and your installer from the portal, with the whole conversation kept in one place.",
    where: "Messages",
  },
  {
    icon: "payments",
    title: "Payments and receipts",
    body: "Pay your deposit, see what's paid and what's still due, and download receipts when you need them.",
    where: "Payments",
  },
  {
    icon: "spark",
    title: "Ask EasyLink AI",
    body: "Ask about your design, rebates, payments or install date and get a plain answer, any time of day.",
    where: "On every screen",
  },
  {
    icon: "maintenance",
    title: "After switch-on",
    body: "Add a maintenance plan to keep your system performing, and keep your account details up to date.",
    where: "Maintenance plan",
  },
];

const STEPS: { title: string; body: string }[] = [
  {
    title: "Design your system",
    body: "Use our online design tool to size solar and a battery for your roof.",
  },
  {
    title: "Open your portal",
    body: "Create an account, or get a one-time sign-in link by email. No password needed.",
  },
  {
    title: "Follow it through to switch-on",
    body: "Approve your design, book the site visit and track your installation, all in one place.",
  },
];

/** Illustration of the journey tracker (labels only, no customer data). */
const PREVIEW_STEPS: { label: string; state: "done" | "now" | "next" }[] = [
  { label: "Design", state: "done" },
  { label: "Site visit", state: "now" },
  { label: "Installation", state: "next" },
  { label: "Switch-on", state: "next" },
];

function Cta({ href, children, variant, icon }: { href: string; children: ReactNode; variant: "primary" | "ghost-dark" | "quiet"; icon?: PortalIconName }) {
  const styles = {
    primary: "bg-[#F68A0A] text-[#3B1D00] hover:bg-[#FF9A1F] focus-visible:outline-[#FFE866]",
    "ghost-dark": "border border-[#3E5A80] text-white hover:bg-white/[0.06] focus-visible:outline-[#FFE866]",
    quiet: "border border-[#CBD5E1] bg-white text-[#0F172A] hover:border-[#64748B] focus-visible:outline-[#2563EB]",
  }[variant];
  return (
    <Link
      href={href}
      className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[13px] px-5 text-[15px] font-bold no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${styles}`}
    >
      {children}
      {icon ? <PortalIcon name={icon} size={18} /> : null}
    </Link>
  );
}

function JourneyPreview() {
  return (
    <figure className="m-0 flex flex-col gap-3 rounded-[20px] bg-white p-5 text-[#0F172A] shadow-[0_24px_60px_rgba(0,0,0,0.28)] sm:p-6">
      <div className="flex items-baseline justify-between gap-2">
        <p className="m-0 text-[16px] font-bold">Your solar journey</p>
        <span className="text-[12.5px] text-[#5B6B80]">Example</span>
      </div>
      <ol className="m-0 grid list-none grid-cols-2 gap-2 p-0">
        {PREVIEW_STEPS.map((s) => (
          <li
            key={s.label}
            className={`flex flex-col gap-1 rounded-[12px] border p-3 ${
              s.state === "now" ? "border-[#F68A0A] bg-[#FFF4D6]" : s.state === "done" ? "border-[#BBF7D0] bg-[#ECFDF3]" : "border-[#E2E8F0] bg-[#F8FAFC]"
            }`}
          >
            <span className={`flex items-center gap-1 text-[11.5px] font-bold ${s.state === "now" ? "text-[#7A3E00]" : s.state === "done" ? "text-[#15803D]" : "text-[#5B6B80]"}`}>
              {s.state === "done" ? <PortalIcon name="check" size={13} /> : null}
              {s.state === "done" ? "Done" : s.state === "now" ? "You are here" : "Coming up"}
            </span>
            <span className="text-[14px] font-bold">{s.label}</span>
          </li>
        ))}
      </ol>
      <div className="flex items-start gap-2.5 rounded-[12px] bg-[#F4F6FA] p-3">
        <PortalIcon name="spark" size={17} className="mt-[1px] shrink-0 text-[#F68A0A]" />
        <p className="m-0 text-[13.5px] leading-[1.45] text-[#334155]">
          &ldquo;What happens at the site visit?&rdquo; Ask EasyLink AI and get a plain answer.
        </p>
      </div>
      <figcaption className="sr-only">Example of the journey tracker in the customer portal</figcaption>
    </figure>
  );
}

export function CustomerPortalLanding() {
  return (
    <div className="bg-[#F4F6FA] font-inter text-[#0F172A]">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-16 px-4 pb-20 pt-[100px] sm:px-6 sm:pt-[112px] lg:gap-20 lg:px-8">
        {/* The one bold thing on the page. */}
        <section aria-labelledby="portal-hero" className="relative overflow-hidden rounded-[28px] bg-[#0B1A2E] text-white">
          <SunMotif className="absolute -bottom-40 -right-32 size-[380px] text-[#F68A0A] opacity-[0.14] lg:-bottom-52 lg:-right-24 lg:size-[520px]" />
          <div className="relative grid gap-10 p-6 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-12 lg:p-14">
            <div className="flex flex-col gap-5">
              <p className="m-0 flex items-center gap-2 text-[14px] font-bold text-[#FFE866]">
                <PortalIcon name="sun" size={18} />
                EasyLink customer portal
              </p>
              <h1 id="portal-hero" className="m-0 max-w-[600px] font-source-sans text-[34px] font-extrabold leading-[1.1] tracking-[-0.015em] sm:text-[46px] lg:text-[52px]">
                Your solar, from design to switch-on, in one place
              </h1>
              <p className="m-0 max-w-[540px] text-[16.5px] leading-[1.6] text-[#D6E1F0]">
                Design your system online, then follow every step in your portal: your design and savings, your installation, messages,
                payments and answers from EasyLink AI.
              </p>
              <div className="mt-1 flex flex-col gap-3 sm:flex-row">
                <Cta href="/designs" variant="primary" icon="arrow">
                  Design my system
                </Cta>
                <Cta href="/customers/auth" variant="ghost-dark">
                  Sign in
                </Cta>
              </div>
            </div>
            <JourneyPreview />
          </div>
        </section>

        <section aria-labelledby="portal-features" className="flex flex-col gap-6">
          <div className="flex max-w-[680px] flex-col gap-2">
            <h2 id="portal-features" className="m-0 font-source-sans text-[28px] font-extrabold leading-[1.15] tracking-[-0.01em] sm:text-[34px]">
              Everything about your system, in one place
            </h2>
            <p className="m-0 text-[16px] leading-[1.55] text-[#475569]">
              No chasing emails or wondering what&apos;s next. Here&apos;s what you can do once you&apos;re signed in.
            </p>
          </div>
          <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex flex-col gap-3 rounded-[20px] border border-[#E2E8F0] bg-white p-5 sm:p-6">
                <span className="flex size-11 items-center justify-center rounded-[12px] bg-[#F4F6FA] text-[#0B1A2E]">
                  <PortalIcon name={f.icon} size={21} />
                </span>
                <h3 className="m-0 text-[17px] font-bold">{f.title}</h3>
                <p className="m-0 flex-1 text-[14.5px] leading-[1.55] text-[#475569]">{f.body}</p>
                <p className="m-0 text-[12.5px] font-semibold text-[#5B6B80]">In the portal: {f.where}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="portal-how" className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
          <div className="flex flex-col gap-2">
            <h2 id="portal-how" className="m-0 font-source-sans text-[28px] font-extrabold leading-[1.15] tracking-[-0.01em] sm:text-[34px]">
              How it works
            </h2>
            <p className="m-0 max-w-[420px] text-[16px] leading-[1.55] text-[#475569]">
              Three steps from first idea to a system on your roof.
            </p>
          </div>
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex items-start gap-4 rounded-[20px] border border-[#E2E8F0] bg-white p-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#0B1A2E] text-[15px] font-bold text-[#FFE866]" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="m-0 text-[17px] font-bold">
                    <span className="sr-only">Step {i + 1}: </span>
                    {s.title}
                  </h3>
                  <p className="m-0 text-[14.5px] leading-[1.55] text-[#475569]">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="portal-start" className="flex flex-col items-start gap-5 rounded-[22px] border border-[#E2E8F0] bg-white p-6 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-[560px] flex-col gap-2">
            <h2 id="portal-start" className="m-0 font-source-sans text-[26px] font-extrabold leading-[1.2] tracking-[-0.01em] sm:text-[30px]">
              Ready to see what solar could do for your home?
            </h2>
            <p className="m-0 text-[15.5px] leading-[1.55] text-[#475569]">
              Start with a design. Already working with us? Sign in to pick up where you left off.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <Cta href="/designs" variant="primary" icon="arrow">
              Design my system
            </Cta>
            <Cta href="/customers/auth" variant="quiet">
              Sign in
            </Cta>
            <button
              type="button"
              onClick={() => askEasylinkAi("What can I do in the EasyLink customer portal?")}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[13px] px-3 text-[15px] font-bold text-[#1D4ED8] hover:bg-[#EEF2FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
            >
              <PortalIcon name="spark" size={18} />
              Ask EasyLink AI
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
