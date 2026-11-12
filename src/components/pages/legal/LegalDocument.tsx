import Link from "next/link";
import type { ReactNode } from "react";
import { FooterSection } from "@/components/modules/LandingFooter";
import { Header } from "@/components/modules/LandingHero";

export type LegalSection = { id: string; title: string; body: ReactNode };

export const LEGAL_CONTACT = {
  business: "EasyLink Solar (operated by Easylink Plus)",
  email: "sales@easylinksolar.com.au",
  phone: "02 9070 1201",
  phoneHref: "tel:+61290701201",
};

export const LEGAL_PAGES = [
  { href: "/privacy-policy", label: "Privacy policy" },
  { href: "/terms", label: "Terms and conditions" },
  { href: "/refunds", label: "Refunds and cancellations" },
  { href: "/cookies", label: "Cookie policy" },
] as const;

export function P({ children }: { children: ReactNode }) {
  return <p className="m-0 text-[16px] leading-[1.7] text-slate-700">{children}</p>;
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="m-0 flex list-disc flex-col gap-2 pl-5 text-[16px] leading-[1.65] text-slate-700">
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  );
}

export function ContactLines() {
  return (
    <List
      items={[
        <>
          Email{" "}
          <a href={`mailto:${LEGAL_CONTACT.email}`} className="font-semibold text-sky-700 underline">
            {LEGAL_CONTACT.email}
          </a>
        </>,
        <>
          Phone{" "}
          <a href={LEGAL_CONTACT.phoneHref} className="font-semibold text-sky-700 underline">
            {LEGAL_CONTACT.phone}
          </a>
        </>,
      ]}
    />
  );
}

export function LegalDocument({ title, updated, intro, sections }: { title: string; updated: string; intro: ReactNode; sections: LegalSection[] }) {
  return (
    <>
      <Header />
      <main className="bg-white">
        <div className="mx-auto flex w-full max-w-[780px] flex-col gap-10 px-6 py-14 lg:py-20">
          <header className="flex flex-col gap-4">
            <h1 className="m-0 font-source-sans text-[38px] font-extrabold leading-tight text-slate-950 sm:text-[48px]">{title}</h1>
            <p className="m-0 text-[14px] text-slate-500">Last updated {updated}</p>
            <div className="flex flex-col gap-4">{intro}</div>
          </header>

          <nav aria-label="On this page" className="rounded-2xl bg-slate-50 p-5">
            <p className="m-0 mb-2 text-[13px] font-bold uppercase tracking-wide text-slate-500">On this page</p>
            <ol className="m-0 grid gap-1.5 pl-5 text-[15px] sm:grid-cols-2">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-sky-700 underline-offset-2 hover:underline">
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {sections.map((s) => (
            <section key={s.id} id={s.id} className="flex scroll-mt-24 flex-col gap-4">
              <h2 className="m-0 font-source-sans text-[26px] font-bold text-slate-950">{s.title}</h2>
              {s.body}
            </section>
          ))}

          <nav aria-label="Other policies" className="flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-200 pt-6 text-[15px]">
            {LEGAL_PAGES.filter((p) => p.label !== title).map((p) => (
              <Link key={p.href} href={p.href} className="font-semibold text-sky-700 hover:underline">
                {p.label}
              </Link>
            ))}
          </nav>
        </div>
      </main>
      <FooterSection />
    </>
  );
}
