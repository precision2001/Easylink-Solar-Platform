"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { aud, publicMarket, systemLine, type BuyResult, type PublicDeal } from "@/lib/ai-platform/market";

const STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"];
const input = "w-full rounded-[10px] border border-[#CBD5E1] bg-white px-3 py-2 text-[15px] text-[#0F172A] focus:border-[#0B4A7A] focus:outline-none";

/** Website /ready-deals/[id]: the deal, Buy Now (details, ownership, consent, terms), then the 50% payment. */
export function DealCheckout({ id }: { id: string }) {
  const [deal, setDeal] = useState<PublicDeal | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [f, setF] = useState({ name: "", phone: "", email: "", street: "", suburb: "", state: "NSW", postcode: "", building: "house" });
  const [owner, setOwner] = useState(false);
  const [consent, setConsent] = useState(false);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<BuyResult | null>(null);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    publicMarket.deal(id).then(setDeal).catch((e: Error) => setLoadError(e.message));
  }, [id]);

  if (loadError)
    return (
      <div className="mx-auto max-w-[720px] px-4 pb-16 md:px-6">
        <p className="rounded-[12px] border border-[#E3E8EF] p-6 text-[15px] text-[#334155]">
          {loadError}{" "}
          <Link href="/ready-deals" className="font-semibold text-[#0B4A7A] underline">
            See current deals
          </Link>
        </p>
      </div>
    );
  if (!deal) return <p className="mx-auto max-w-[1080px] px-4 pb-16 text-[15px] text-[#475569] md:px-6">Loading the deal…</p>;

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: k === "postcode" ? e.target.value.replace(/\D/g, "").slice(0, 4) : e.target.value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await publicMarket.buy(deal.id, { customer: { name: f.name, phone: f.phone, email: f.email, street: f.street, suburb: f.suburb, state: f.state, postcode: f.postcode }, building: f.building, owner, consent, terms });
      setOrder(r);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const pay = async () => {
    if (!order) return;
    setBusy(true);
    setError(null);
    try {
      const r = await publicMarket.pay(order.orderId, order.payToken);
      if (r.payUrl) window.location.href = r.payUrl;
      else if (r.paid) setPaid(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const summary = (
    <aside className="flex h-fit flex-col gap-3 rounded-[16px] border border-[#E3E8EF] bg-white p-5 lg:sticky lg:top-24">
      {deal.badge && <span className="w-fit rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-[12px] font-bold text-[#92400E]">{deal.badge}</span>}
      <h2 className="m-0 font-source-sans text-[20px] font-bold text-[#0F172A]">{deal.title}</h2>
      <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[14px] text-[#334155]">
        {deal.items.map((i) => (
          <li key={i.model}>
            {i.qty} × {i.model}
          </li>
        ))}
        <li className="text-[#475569]">Installation and commissioning by {deal.installerName}</li>
      </ul>
      <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-t border-[#EEF2F6] pt-3 text-[14px]">
        {deal.stcs > 0 && (
          <>
            <dt className="text-[#475569]">STC rebate included ({deal.stcs} STCs)</dt>
            <dd className="m-0 text-right text-[#166534]">−{aud(deal.stcValue)}</dd>
          </>
        )}
        <dt className="font-semibold text-[#0F172A]">Price (GST incl.)</dt>
        <dd className="m-0 text-right font-semibold">{aud(deal.price)}</dd>
        <dt className="text-[#475569]">Pay now (50%)</dt>
        <dd className="m-0 text-right">{aud(deal.deposit)}</dd>
        <dt className="text-[#475569]">Before installation (50%)</dt>
        <dd className="m-0 text-right">{aud(deal.price - deal.deposit)}</dd>
      </dl>
      <p className="m-0 text-[12.5px] text-[#475569]">{systemLine(deal.system, deal.kw)}</p>
    </aside>
  );

  if (order)
    return (
      <div className="mx-auto grid max-w-[1080px] grid-cols-1 gap-6 px-4 pb-16 md:px-6 lg:grid-cols-[1fr_340px]">
        <section className="flex flex-col gap-4 rounded-[16px] border border-[#A7E3BD] bg-white p-6">
          <p className="m-0 text-[13px] font-bold uppercase tracking-[0.08em] text-[#166534]">Order {order.orderRef}</p>
          {paid ? (
            <>
              <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">Paid. {deal.installerName} will call you.</h1>
              <ol className="m-0 flex flex-col gap-2 pl-5 text-[15px] leading-relaxed text-[#334155]">
                <li>{deal.installerName} calls you to arrange a site check (photos or a visit).</li>
                <li>You sign the installation agreement with a code we text you.</li>
                <li>You pick your installation dates; the other 50% ({aud(order.balance)}) is due before installation starts.</li>
              </ol>
              <p className="m-0 text-[14px] text-[#334155]">We&apos;ve emailed your receipt and a link to your customer portal, where you&apos;ll see every step.</p>
              <Link href="/customers/project" className="w-fit rounded-[10px] bg-[#0B4A7A] px-5 py-2.5 text-[15px] font-semibold text-white">
                Go to My Project
              </Link>
            </>
          ) : (
            <>
              <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">Pay {aud(order.deposit.amount)} to secure your deal</h1>
              <p className="m-0 text-[15px] text-[#334155]">
                That&apos;s 50% now (invoice {order.deposit.number}). The other 50%, {aud(order.balance)}, is due before installation starts.
              </p>
              <button type="button" onClick={pay} disabled={busy} className="w-fit rounded-[10px] bg-[#0B4A7A] px-6 py-3 text-[16px] font-semibold text-white disabled:opacity-60">
                {busy ? "Opening secure payment…" : `Pay ${aud(order.deposit.amount)} by card`}
              </button>
              <p className="m-0 text-[13px] text-[#475569]">We&apos;ve also emailed you the invoice, so you can pay later from your portal.</p>
            </>
          )}
          {error && <p className="m-0 text-[14px] text-[#991B1B]">{error}</p>}
          <Refunds policy={order.refundPolicy} />
        </section>
        {summary}
      </div>
    );

  return (
    <div className="mx-auto grid max-w-[1080px] grid-cols-1 gap-6 px-4 pb-16 md:px-6 lg:grid-cols-[1fr_340px]">
      <form onSubmit={submit} className="flex flex-col gap-5 rounded-[16px] border border-[#E3E8EF] bg-white p-6" noValidate>
        <h1 className="m-0 font-source-sans text-[26px] font-bold text-[#0F172A]">Buy this deal</h1>
        <fieldset className="m-0 grid grid-cols-1 gap-3 border-0 p-0 sm:grid-cols-2">
          <legend className="mb-2 text-[15px] font-bold text-[#0F172A]">Your details</legend>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-[#334155] sm:col-span-2">
            Full name
            <input required autoComplete="name" value={f.name} onChange={set("name")} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-[#334155]">
            Mobile
            <input required type="tel" autoComplete="tel" placeholder="04xx xxx xxx" value={f.phone} onChange={set("phone")} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-[#334155]">
            Email
            <input required type="email" autoComplete="email" value={f.email} onChange={set("email")} className={input} />
          </label>
        </fieldset>
        <fieldset className="m-0 grid grid-cols-1 gap-3 border-0 p-0 sm:grid-cols-6">
          <legend className="mb-2 text-[15px] font-bold text-[#0F172A]">Installation address</legend>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-[#334155] sm:col-span-6">
            Street address
            <input required autoComplete="address-line1" value={f.street} onChange={set("street")} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-[#334155] sm:col-span-3">
            Suburb
            <input required autoComplete="address-level2" value={f.suburb} onChange={set("suburb")} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-[#334155] sm:col-span-1">
            State
            <select value={f.state} onChange={set("state")} className={input}>
              {STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-[#334155] sm:col-span-2">
            Postcode
            <input required inputMode="numeric" autoComplete="postal-code" value={f.postcode} onChange={set("postcode")} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-[#334155] sm:col-span-3">
            Building
            <select value={f.building} onChange={set("building")} className={input}>
              {deal.buildingTypes.map((b) => (
                <option key={b} value={b}>
                  {b[0]!.toUpperCase() + b.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <p className="m-0 self-end text-[12.5px] text-[#475569] sm:col-span-3">{deal.installerName} installs in {deal.serviceAreas}.</p>
        </fieldset>
        <div className="flex flex-col gap-2.5 text-[14px] text-[#334155]">
          <label className="flex items-start gap-2.5">
            <input type="checkbox" checked={owner} onChange={(e) => setOwner(e.target.checked)} className="mt-1 h-4 w-4 accent-[#0B4A7A]" />
            <span>I own this property, or I have the owner&apos;s permission to install.</span>
          </label>
          <label className="flex items-start gap-2.5">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-[#0B4A7A]" />
            <span>
              {deal.installerName} and EasyLink Solar can contact me by phone, SMS and email about this order. My details go only to this installer.
            </span>
          </label>
          <label className="flex items-start gap-2.5">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 h-4 w-4 accent-[#0B4A7A]" />
            <span>
              I accept the terms: 50% now, 50% before installation, the installer confirms the site first, and the refund policy below.
            </span>
          </label>
        </div>
        <Refunds policy={deal.refundPolicy} />
        {error && <p className="m-0 rounded-[10px] bg-[#FEF2F2] p-3 text-[14px] text-[#991B1B]">{error}</p>}
        <button type="submit" disabled={busy || deal.remaining <= 0} className="rounded-[10px] bg-[#0B4A7A] px-6 py-3 text-[16px] font-semibold text-white hover:bg-[#093d65] disabled:opacity-60">
          {deal.remaining <= 0 ? "Sold out" : busy ? "Placing your order…" : `Continue to pay ${aud(deal.deposit)}`}
        </button>
      </form>
      {summary}
    </div>
  );
}

function Refunds({ policy }: { policy: string[] }) {
  return (
    <details className="rounded-[10px] bg-[#F8FAFC] p-3 text-[13px] text-[#334155]">
      <summary className="cursor-pointer font-semibold text-[#0F172A]">Refund policy</summary>
      <ul className="mb-0 mt-2 flex flex-col gap-1 pl-5">
        {policy.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </details>
  );
}
