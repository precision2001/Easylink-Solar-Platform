"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { askEasylinkAi } from "@/components/ai-chat/EasylinkAiChatbot";
import { PortalIcon, type PortalIconName } from "@/components/customer/portal/PortalIcon";
import { estimateYear, LANDING_OPTIONS, LANDING_CITIES } from "@/lib/customers/landing-estimate";

/**
 * Public /customers page (Nov 2026 redesign): Design Platform video, a look
 * inside the platform, a savings illustration, the AI journey, product
 * choice, the portal and our promise.
 *
 * Reviews: REVIEWS stays empty until EasyLink supplies real, verified
 * reviews; the section is not rendered while it is empty. Never add
 * invented or sample reviews here (Australian Consumer Law).
 */

type Review = { quote: string; name: string; suburb: string; system: string; response?: string };
const REVIEWS: Review[] = [];
const REVIEW_SUMMARY: { rating: string; count: number; source: string } | null = null;

const BTN_SUN =
  "inline-flex min-h-[52px] items-center justify-center rounded-[20px] bg-gradient-to-r from-[#FFE866] to-[#F68A0A] px-6 text-[16px] font-semibold text-[#3B1D00] no-underline transition-transform hover:-translate-y-0.5 hover:text-[#3B1D00] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#2196F3] motion-reduce:transition-none";
const H2 = "m-0 font-source-sans text-[34px] font-extrabold leading-[1.08] tracking-[-0.01em] sm:text-[44px] lg:text-[56px]";
const WRAP = "mx-auto flex w-full max-w-[1320px] flex-col";
const PAD = "px-4 py-14 sm:px-8 lg:px-14 lg:py-24";

function Chip({ on, onClick, children, dark = false }: { on: boolean; onClick: () => void; children: ReactNode; dark?: boolean }) {
  const off = dark ? "border-[#3B5B85] bg-transparent text-white" : "border-[#CBD5E1] bg-white text-[#0B2540]";
  const active = dark ? "border-[#FFE866] bg-[#FFE866] text-[#3B1D00]" : "border-[#0B2540] bg-[#0B2540] text-white";
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-[44px] rounded-[20px] border-[1.5px] px-4 text-left text-[14px] font-semibold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#2196F3] ${on ? active : off}`}
    >
      {children}
    </button>
  );
}

const money = (n: number) => `$${Math.round(Math.abs(n)).toLocaleString("en-AU")}`;

/* ---------------- Hero ---------------- */

function Hero() {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.muted = true;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      v.pause();
      return;
    }
    v.play().catch(() => {});
  }, []);
  return (
    <section className={`bg-[#0B1A2E] text-white ${PAD} lg:pt-14`}>
      <div className={`${WRAP} gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-16`}>
        <div className="flex flex-col gap-6">
          <h1 className="m-0 font-source-sans text-[44px] font-extrabold leading-[1.02] tracking-[-0.02em] sm:text-[64px] lg:text-[80px]">
            Open your power bill and smile.
          </h1>
          <p className="m-0 max-w-[34em] text-[18px] leading-[1.55] text-[#D6E2F0] lg:text-[20px]">
            You look after your family. We&apos;ll look after the energy. Our AI designs your system in minutes, real people stand behind every step, and we stay long after the panels go on.
          </p>
          <form action="/designs" method="get" className="flex max-w-[560px] flex-col gap-2.5">
            <label htmlFor="cust-address" className="text-[15px] font-semibold">
              Start with your address
            </label>
            <div className="flex flex-wrap gap-2.5">
              <input
                id="cust-address"
                name="address"
                type="text"
                autoComplete="street-address"
                placeholder="12 Wattle Street, Parramatta NSW"
                className="min-h-[56px] min-w-0 flex-[1_1_260px] rounded-[20px] border-2 border-[#2196F3] bg-white px-4 text-[16px] font-medium text-black placeholder:text-[#64748B]"
              />
              <button type="submit" className={`${BTN_SUN} min-h-[56px]`}>
                See my home&apos;s design
              </button>
            </div>
          </form>
          <p className="m-0 flex flex-wrap gap-x-8 gap-y-2 text-[15px] text-[#D6E2F0]">
            <span>
              <b className="text-white">No</b> pushy sales calls
            </span>
            <span>
              <b className="text-white">Itemised</b> prices
            </span>
            <span>
              <b className="text-white">Accredited</b> installers
            </span>
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <div className="rounded-[32px] bg-gradient-to-br from-[#66FF80] to-[#B36BFF] p-[3px]">
            <video
              ref={video}
              src="/videos/customers/design-platform.mp4"
              poster="/images/customers/design-platform-poster.jpg"
              autoPlay
              muted
              loop
              playsInline
              controls
              preload="metadata"
              aria-label="A walk through the EasyLink Design Platform, from typing an address to seeing the system on a home"
              className="block aspect-video h-auto w-full rounded-[29px] bg-[#0B1426]"
            />
          </div>
          <p className="m-0 text-[14px] leading-[1.5] text-[#B8C7DA]">From your address to your own system in minutes. Sample address and figures shown.</p>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Inside the platform ---------------- */

const SHOTS: { src: string; alt: string; title: string; body: string }[] = [
  { src: "start", alt: "Start a design screen with address, aerial roof outline and the AI reading of a power bill", title: "Start with your address.", body: "AI reads your roof and your bill." },
  { src: "roof-winter", alt: "3D roof model with solar panels, winter shade and live AI checks", title: "Explore your roof in 3D.", body: "Move panels and check summer and winter shade." },
  { src: "options-max", alt: "Essential, Bill-Buster, Electrify-Ready and Maximum system options side by side", title: "Compare three options.", body: "Unlock Maximum with a three-phase upgrade." },
  { src: "products", alt: "Product selection with batteries, compatibility checks and sponsored labels", title: "Swap any part.", body: "AI checks everything still works together." },
  { src: "pricing", alt: "Itemised price with rebates, payment options and an AI price check", title: "See every dollar.", body: "Parts, rebates and ways to pay, line by line." },
  { src: "ar", alt: "Preview of solar panels on a house, shown on a phone", title: "Picture it on your home.", body: "Share it with the family before you decide." },
];

function Inside() {
  return (
    <section id="inside" className={`bg-[#0B1426] text-white ${PAD}`}>
      <div className={`${WRAP} gap-8`}>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex max-w-[760px] flex-col gap-3">
            <h2 className={H2}>Take a look inside the Design Platform.</h2>
            <p className="m-0 text-[18px] leading-[1.5] text-[#D6E2F0]">No sales call and no guesswork. Just your home, your options and every number, laid out for you.</p>
          </div>
          <Link href="/designs" className={BTN_SUN}>
            Try it on my home
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SHOTS.map((s) => (
            <figure key={s.src} className="m-0 flex flex-col gap-3">
              <Image
                src={`/images/customers/platform-${s.src}.jpg`}
                alt={s.alt}
                width={1100}
                height={688}
                sizes="(min-width: 1024px) 420px, (min-width: 640px) 50vw, 100vw"
                className="block h-auto w-full rounded-[20px]"
              />
              <figcaption className="leading-[1.45]">
                <b>{s.title}</b> <span className="text-[#D6E2F0]">{s.body}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="m-0 text-[13px] text-[#B8C7DA]">Sample screens with an example address and illustrative figures. Your design shows your own numbers.</p>
      </div>
    </section>
  );
}

/* ---------------- Your numbers ---------------- */

function Numbers() {
  const [bill, setBill] = useState(750);
  const [city, setCity] = useState(0);
  const [option, setOption] = useState(1);
  const [vpp, setVpp] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [wantMax, setWantMax] = useState(false);
  const r = useMemo(() => estimateYear({ quarterlyBill: bill, cityIndex: city, optionIndex: option, vpp }), [bill, city, option, vpp]);
  const o = LANDING_OPTIONS[option];

  return (
    <section id="numbers" className={`bg-gradient-to-r from-[#FFE866] to-[#F68A0A] ${PAD}`}>
      <div className={`${WRAP} gap-8`}>
        <div className="flex max-w-[760px] flex-col gap-3 text-[#3B1D00]">
          <h2 className={H2}>From a bill you dread to an account that pays you.</h2>
          <p className="m-0 text-[18px] leading-[1.5]">Move the slider. Every number below comes from assumptions you can read, not a sales pitch.</p>
        </div>

        <div className="grid gap-10 rounded-[32px] bg-[#0B1A2E] p-5 text-white sm:p-8 lg:grid-cols-2 lg:rounded-[44px] lg:p-12">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <label htmlFor="bill" className="font-semibold">
                My quarterly power bill
              </label>
              <div className="font-source-sans text-[44px] font-extrabold">{money(bill)}</div>
              <input id="bill" type="range" min={200} max={1500} step={25} value={bill} onChange={(e) => setBill(Number(e.target.value))} className="h-11 w-full accent-[#F68A0A]" />
            </div>
            <div role="group" aria-label="My city" className="flex flex-wrap gap-2">
              {LANDING_CITIES.map((c, i) => (
                <Chip key={c.name} dark on={city === i} onClick={() => setCity(i)}>
                  {c.name}
                </Chip>
              ))}
            </div>
            <div role="group" aria-label="System option" className="flex flex-col gap-2.5">
              {LANDING_OPTIONS.map((x, i) => {
                const locked = x.needsThreePhase && !unlocked;
                return (
                  <Chip
                    key={x.name}
                    dark
                    on={option === i}
                    onClick={() => {
                      if (locked) setWantMax(true);
                      else {
                        setOption(i);
                        setWantMax(false);
                      }
                    }}
                  >
                    <span className="flex min-h-[46px] items-center justify-between gap-3 py-1.5">
                      <span>
                        <b className="block text-[16px]">{x.name}</b>
                        <span className="text-[13px] font-medium">{x.spec}</span>
                      </span>
                      <span className="whitespace-nowrap text-[12px] font-bold">{x.needsThreePhase ? (unlocked ? "Unlocked" : "Unlock") : x.badge}</span>
                    </span>
                  </Chip>
                );
              })}
            </div>
            {wantMax && !unlocked ? (
              <div className="flex flex-col gap-2.5 rounded-[20px] border-[1.5px] border-dashed border-[#FFE866] p-4">
                <p className="m-0 text-[15px] leading-[1.45]">Maximum needs a three-phase supply. Your installer quotes the upgrade, and you see the price before you approve anything.</p>
                <button
                  type="button"
                  onClick={() => {
                    setUnlocked(true);
                    setOption(3);
                    setWantMax(false);
                  }}
                  className={`${BTN_SUN} min-h-[44px] self-start`}
                >
                  Include the three-phase upgrade
                </button>
              </div>
            ) : null}
            <label className="flex min-h-[44px] cursor-pointer items-center gap-3 font-medium">
              <input type="checkbox" checked={vpp} onChange={(e) => setVpp(e.target.checked)} className="size-[22px] accent-[#22C55E]" />
              Join a virtual power plant (+$300 a year, illustrative)
            </label>
          </div>

          <div className="flex flex-col gap-5" aria-live="polite">
            <div>
              <div className="text-[15px] font-semibold text-[#D6E2F0]">{r.net < 0 ? "Your electricity account, a year in" : "Your electricity cost, a year in"}</div>
              <div className={`font-source-sans text-[64px] font-extrabold leading-none sm:text-[96px] ${r.net < 0 ? "text-[#86EFAC]" : "text-[#FFE866]"}`}>
                {money(r.net)}
                {r.net < 0 ? " credit" : ""}
              </div>
              <div className="mt-1.5 text-[#D6E2F0]">
                Today you pay {money(r.today)} a year. Saving {money(r.save)} a year.
              </div>
            </div>
            <div className="flex flex-col gap-2.5" aria-hidden="true">
              <span className="text-[13px] text-[#D6E2F0]">Today</span>
              <div className="h-[18px] w-full rounded-full bg-[#FB7185]" />
              <span className="text-[13px] text-[#D6E2F0]">With EasyLink</span>
              <div className="h-[18px] rounded-full bg-[#22C55E] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${Math.max(2, Math.min(100, (Math.max(0, r.net) / r.today) * 100))}%` }} />
            </div>
            <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-[#3B5B85] pt-4 text-[15px]">
              <dt className="text-[#D6E2F0]">Daily supply charge</dt>
              <dd className="m-0 text-right">{money(r.supply)}</dd>
              <dt className="text-[#D6E2F0]">Grid top-ups</dt>
              <dd className="m-0 text-right">{money(r.imports)}</dd>
              <dt className="text-[#D6E2F0]">Feed-in credits</dt>
              <dd className="m-0 text-right">−{money(r.exports)}</dd>
              <dt className="text-[#D6E2F0]">VPP credits</dt>
              <dd className="m-0 text-right">−{money(r.vpp)}</dd>
            </dl>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
              <div className="rounded-[20px] bg-[#1E3A5F] p-4">
                <div className="text-[13px] text-[#D6E2F0]">Illustrative price</div>
                <div className="font-source-sans text-[28px] font-extrabold">{money(o.price)}</div>
              </div>
              <div className="rounded-[20px] bg-[#1E3A5F] p-4">
                <div className="text-[13px] text-[#D6E2F0]">Paid back in</div>
                <div className="font-source-sans text-[28px] font-extrabold">{r.save > 0 ? `${(o.price / r.save).toFixed(1)} yrs` : "n/a"}</div>
              </div>
              <div className="rounded-[20px] bg-[#1E3A5F] p-4">
                <div className="text-[13px] text-[#D6E2F0]">Net gain, 15 years</div>
                <div className="font-source-sans text-[28px] font-extrabold text-[#86EFAC]">
                  {r.save * 15 >= o.price ? "+" : "−"}
                  {money(r.save * 15 - o.price)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="m-0 max-w-[1040px] text-[14px] leading-[1.55] text-[#3B1D00]">
          <b>The honest bit.</b> This is an illustration, not a quote. It assumes a $1.30 daily supply charge, 35c/kWh grid power, 5c/kWh feed-in, flat prices and no panel or battery ageing. Prices are illustrative and include typical rebates. Most homes keep a supply charge, and any credit depends on your tariff, roof, usage, export limit and plan. Your own design replaces all of this with real figures.
        </p>
      </div>
    </section>
  );
}

/* ---------------- Journey ---------------- */

const STEPS: [string, string, string, string, string][] = [
  ["Address", "Your roof, mapped in seconds", "Finds your home from above, measures each roof face and works out how many panels fit.", "Type your address. That's it.", "A designer checks anything unusual, such as shade or a tricky roof."],
  ["Bill", "Your bill, finally explained", "Reads your bill, works out your tariff and usage, and spots what you're overpaying.", "Upload a photo or the PDF.", "Someone can walk you through it on the phone, if you'd like."],
  ["Design", "Three clear options, built for you", "Prepares three systems sized to your home, with a Maximum option you can unlock.", "Compare them side by side.", "A designer answers your questions, with no pressure."],
  ["Choose", "Make it yours", "Reprices every swap instantly and checks that each part works together.", "Keep our pick or swap any brand.", "Honest advice on what's worth paying for, and what isn't."],
  ["Approve", "The paperwork, handled", "Prepares rebates, network approval and your quote, then tracks each one.", "Review, choose how to pay and accept online.", "Your team checks everything before it goes in."],
  ["Install", "An accredited installer at your door", "Matches your job to an installer and sends live updates and reminders.", "Put the kettle on.", "Licensed professionals do the work. Photos are logged to your portal."],
  ["Switch on", "Your first free sunshine", "Helps you compare plans, including free-midday and VPP offers where available.", "Pick a plan, and watch your app light up.", "Your installer shows you around the system."],
  ["Care", "Looked after, for years", "Keeps your documents and warranties together and reminds you about servicing.", "Open your portal when you're curious.", "A real team steps in whenever something needs fixing."],
];

function Journey() {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  return (
    <section id="journey" className={`bg-white text-[#0B2540] ${PAD}`}>
      <div className={`${WRAP} gap-9`}>
        <div className="flex max-w-[780px] flex-col gap-3">
          <h2 className={H2}>Eight steps. We carry the heavy ones.</h2>
          <p className="m-0 text-[18px] leading-[1.5] text-[#475569]">AI does the paperwork, the maths and the chasing. People do the caring, the checking and the climbing on your roof.</p>
        </div>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <div role="group" aria-label="Journey steps" className="grid grid-cols-2 gap-2.5">
            {STEPS.map((x, i) => (
              <Chip key={x[0]} on={step === i} onClick={() => setStep(i)}>
                <span className="block py-2.5">
                  {i + 1} · {x[0]}
                </span>
              </Chip>
            ))}
          </div>
          <div className="flex flex-col gap-4 rounded-[32px] bg-gradient-to-r from-[#86EFAC] to-[#22C55E] p-6 text-[#052E16] sm:p-10 lg:rounded-[44px]">
            <h3 className="m-0 font-source-sans text-[28px] font-extrabold leading-[1.1] sm:text-[40px]">{s[1]}</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["EasyLink AI does", s[2]],
                ["You do", s[3]],
                ["A person backs you", s[4]],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col gap-1.5 rounded-[20px] bg-white p-4">
                  <b className="text-[14px] text-[#1976D2]">{k}</b>
                  <span className="leading-[1.45] text-[#0B2540]">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Choice ---------------- */

const CATS: { name: string; icon: PortalIconName; body: string }[] = [
  { name: "Solar panels", icon: "sun", body: "Tier-1 panels from leading makers, matched to your roof faces and shade." },
  { name: "Inverters", icon: "bolt", body: "Hybrid and string inverters, single and three-phase, checked against your panels." },
  { name: "Batteries", icon: "battery", body: "Brands including Sigenergy, FoxESS, BYD, Sungrow, GoodWe, Tesla and BLUETTI." },
  { name: "EV chargers", icon: "bolt", body: "Chargers that can send your surplus sunshine straight to the car." },
  { name: "Heat pumps", icon: "leaf", body: "Hot water heated by your midday solar, so you can move off gas." },
  { name: "Portable power", icon: "battery", body: "BLUETTI and EcoFlow units for blackouts, camping and the shed." },
];

function Choice() {
  return (
    <section id="choice" className={`bg-[#F1F5F9] text-[#0B2540] ${PAD}`}>
      <div className={`${WRAP} gap-8`}>
        <div className="flex max-w-[780px] flex-col gap-3">
          <h2 className={H2}>Every good brand on the table. One clear recommendation.</h2>
          <p className="m-0 text-[18px] leading-[1.5] text-[#475569]">Choice should feel like freedom, not homework. We show why each product suits your home, and you can swap any part in one tap.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATS.map((c) => (
            <Link key={c.name} href="/products" className="flex flex-col gap-2.5 rounded-[20px] bg-white p-6 text-[#0B2540] no-underline transition-shadow hover:shadow-[0_8px_30px_rgba(11,37,64,0.12)]">
              <span className="flex size-11 items-center justify-center rounded-[12px] bg-[#FFF4D6] text-[#7A3E00]">
                <PortalIcon name={c.icon} size={22} />
              </span>
              <h3 className="m-0 font-source-sans text-[24px] font-bold">{c.name}</h3>
              <p className="m-0 leading-[1.5] text-[#475569]">{c.body}</p>
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="m-0 max-w-[640px] text-[14px] leading-[1.5] text-[#475569]">CEC-approved panels, inverters and batteries. Any paid placement is always labelled Sponsored, so our recommendation stays worth trusting.</p>
          <Link href="/products" className={BTN_SUN}>
            Browse all products
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-x-7 gap-y-2 rounded-[20px] bg-white px-6 py-5">
          <b>Pay your way</b>
          <span>Card</span>
          <span>Afterpay</span>
          <span>Zip</span>
          <span className="text-[14px] text-[#475569]">Afterpay and Zip where your total is eligible</span>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Portal ---------------- */

const PORTAL_CARDS: [string, string][] = [
  ["My design", "Saved options side by side. Change a brand, add a battery later, or unlock Maximum when you're ready."],
  ["Price and rebates", "Every line of your quote, the rebates already taken off, your deposit and how to pay."],
  ["My project", "Each step from site visit to switch-on, with SMS and email reminders along the way."],
  ["My installer", "Who's installing, when they'll arrive, and a message thread straight to them."],
  ["Documents", "Quote, warranties, compliance certificate and photos of your install, kept for life."],
  ["My data and consent", "See what we hold about you and choose who can see it."],
];

const ASKS: [string, string][] = [
  ["When is my installer coming?", "Tuesday at 8am. Your installer will text you when they're on the way, and the booking is in your portal."],
  ["What rebates are on my quote?", "Your quote already takes off the federal solar STCs and the battery rebate you qualify for. Each one is listed on Price and rebates."],
  ["Can I add a battery later?", "Yes. Your design uses a hybrid inverter, so a battery can be added without replacing it. Ask for a new quote from My design."],
];

function Portal() {
  const [ask, setAsk] = useState(0);
  return (
    <section id="portal" className={`bg-gradient-to-r from-[#1E3A5F] to-[#0B1426] text-white ${PAD}`}>
      <div className={`${WRAP} gap-9`}>
        <div className="flex max-w-[780px] flex-col gap-3">
          <h2 className={H2}>Your home&apos;s energy, all in one calm place.</h2>
          <p className="m-0 text-[18px] leading-[1.5] text-[#D6E2F0]">Every design you create opens your own portal, so you never have to wonder what&apos;s happening next.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PORTAL_CARDS.map(([t, b]) => (
            <div key={t} className="flex flex-col gap-2.5 rounded-[20px] bg-white p-6 text-[#0B2540]">
              <h3 className="m-0 font-source-sans text-[22px] font-bold">{t}</h3>
              <p className="m-0 leading-[1.5] text-[#475569]">{b}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4 rounded-[32px] border-[1.5px] border-[#3B5B85] bg-[#0B1A2E] p-5 sm:p-9 lg:rounded-[44px]">
          <h3 className="m-0 font-source-sans text-[28px] font-bold">Ask EasyLink AI anything, day or night</h3>
          <div role="group" aria-label="Example questions" className="flex flex-wrap gap-2">
            {ASKS.map(([q], i) => (
              <Chip key={q} dark on={ask === i} onClick={() => setAsk(i)}>
                {q}
              </Chip>
            ))}
          </div>
          <p className="m-0 max-w-[880px] text-[17px] leading-[1.55] text-[#D6E2F0]">
            <span className="mr-2 rounded-full bg-[#1E3A5F] px-2.5 py-0.5 text-[12px] font-bold text-[#FFE866]">Example</span>
            {ASKS[ask][1]}
          </p>
          <div>
            <button type="button" onClick={() => askEasylinkAi()} className={`${BTN_SUN} min-h-[48px]`}>
              Ask EasyLink AI now
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/customers/auth" className={BTN_SUN}>
            Sign in to my portal
          </Link>
          <Link href="/designs" className="inline-flex min-h-[52px] items-center rounded-[20px] border-[1.5px] border-[#7DD3FC] px-6 font-semibold text-white no-underline hover:text-white">
            Create my free design
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Reviews (hidden until real reviews exist) ---------------- */

function Reviews() {
  if (!REVIEWS.length) return null;
  return (
    <section id="reviews" className={`bg-white text-[#0B2540] ${PAD}`}>
      <div className={`${WRAP} gap-8`}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex max-w-[720px] flex-col gap-3">
            <h2 className={H2}>Don&apos;t take our word for it. Take theirs.</h2>
            <p className="m-0 text-[18px] leading-[1.5] text-[#475569]">Verified customers only. We publish the good and the hard, and we answer both.</p>
          </div>
          {REVIEW_SUMMARY ? (
            <p className="m-0 flex items-baseline gap-2.5">
              <span className="font-source-sans text-[52px] font-extrabold">{REVIEW_SUMMARY.rating}</span>
              <span className="text-[#475569]">
                from {REVIEW_SUMMARY.count} verified reviews on {REVIEW_SUMMARY.source}
              </span>
            </p>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REVIEWS.map((r) => (
            <figure key={r.name + r.suburb} className="m-0 flex flex-col gap-3 rounded-[20px] border border-[#E2E8F0] p-6">
              <blockquote className="m-0 font-source-sans text-[21px] font-semibold leading-[1.35]">{r.quote}</blockquote>
              <figcaption className="text-[14px] text-[#475569]">
                {r.name}, {r.suburb} · {r.system} · Verified install
              </figcaption>
              {r.response ? (
                <p className="m-0 text-[15px] leading-[1.45]">
                  <b>How we made it right:</b> {r.response}
                </p>
              ) : null}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Promise + CTA ---------------- */

function OurPromise() {
  return (
    <section className={`bg-gradient-to-r from-[#FDBA74] to-[#FB7185] text-[#4A1D05] ${PAD}`}>
      <div className={`${WRAP} gap-10 lg:grid lg:grid-cols-2 lg:items-center`}>
        <div className="flex flex-col gap-4">
          <h2 className={H2}>Our promise, in plain words.</h2>
          <p className="m-0 text-[19px] leading-[1.55]">Your home is where your people are. We treat it that way, from the first address you type to the years after the install.</p>
        </div>
        <div className="flex flex-col gap-3.5 text-[17px] leading-[1.45]">
          <p className="m-0">
            <b>No pushy sales calls.</b> Your design is yours to explore at your own pace.
          </p>
          <p className="m-0">
            <b>Itemised prices.</b> See what each part costs, with no hidden extras.
          </p>
          <p className="m-0">
            <b>Licensed, accredited hands.</b> Your install is done by qualified professionals.
          </p>
          <p className="m-0">
            <b>We stay.</b> Your portal keeps your documents, warranties and our team in one place.
          </p>
          <p className="m-0">
            <b>No rush, ever.</b> The federal battery rebate steps down on 1 January 2027, about $590 less on a 14 kWh battery. It&apos;s worth knowing, and it&apos;s not worth a rushed decision.
          </p>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className={`bg-[#0B1A2E] text-white ${PAD}`}>
      <div className={`${WRAP} items-start gap-5`}>
        <h2 className="m-0 max-w-[13em] font-source-sans text-[40px] font-extrabold leading-[1.04] sm:text-[60px] lg:text-[76px]">One less thing to worry about.</h2>
        <p className="m-0 text-[19px] text-[#D6E2F0]">Your free design takes minutes. There&apos;s nothing to sign and no one will chase you.</p>
        <Link href="/designs" className={BTN_SUN}>
          Design my system
        </Link>
        <p className="m-0 max-w-[900px] pt-6 text-[13px] leading-[1.55] text-[#B8C7DA]">
          EasyLink Solar connects customers with licensed electricians and Solar Accreditation Australia accredited installers, who carry out all installation work. Rebates depend on eligibility and install date. The battery rebate example uses the Clean Energy Regulator&apos;s published STC factors (6.8 to 31 December 2026, 5.7 from 1 January 2027) at an assumed $37 per STC.
        </p>
      </div>
    </section>
  );
}

export function CustomerPortalLanding() {
  return (
    <div className="font-inter">
      <Hero />
      <Inside />
      <Numbers />
      <Journey />
      <Choice />
      <Portal />
      <Reviews />
      <OurPromise />
      <FinalCta />
    </div>
  );
}
