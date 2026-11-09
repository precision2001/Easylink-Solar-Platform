"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import Icon from "@/components/ui/Icons";
import { QuantityStepper } from "@/components/cart/QuantityStepper";
import { cart, useCart } from "@/lib/cart/cart-store";
import {
  AU_STATES,
  fetchBuyerSession,
  fetchWarehouses,
  money,
  nearestWarehouse,
  quoteCart,
  startCheckout,
  type AuState,
  type BuyerSession,
  type CartPaymentMethod,
  type CartQuote,
  type Fulfilment,
  type Warehouse,
} from "@/lib/cart/orders-api";

const GRADIENT = "linear-gradient(121.47deg, rgb(32, 148, 243) 0%, rgb(23, 207, 207) 100%)";
const PREFS_KEY = "easylink.cart.prefs.v1";

type Prefs = { warehouseId?: string; fulfilment?: Fulfilment };

function readPrefs(): Prefs {
  try {
    return JSON.parse(window.localStorage.getItem(PREFS_KEY) || "{}") as Prefs;
  } catch {
    return {};
  }
}
function writePrefs(p: Prefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
}

const INPUT =
  "h-10 w-full rounded-lg border border-warm-border bg-white px-3 font-dm-sans text-[14px] text-warm-ink placeholder:text-warm-gray/70 focus:border-brand-blue focus:outline-none";
const LABEL = "mb-1 block font-dm-sans text-[12px] font-semibold text-warm-ink";

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-warm-border bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 font-inter text-[16px] font-bold text-warm-ink">
        <span className="flex size-6 items-center justify-center rounded-full bg-warm-ink font-dm-sans text-[12px] text-white">
          {step}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function CartCheckoutPage() {
  const { lines } = useCart();
  const searchParams = useSearchParams();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [fulfilment, setFulfilment] = useState<Fulfilment>("PICKUP");
  const [warehouseId, setWarehouseId] = useState<string>("");
  const warehouseChosenByUser = useRef(false);
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [session, setSession] = useState<BuyerSession | null | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [suburb, setSuburb] = useState("");
  const [state, setState] = useState<AuState | "">("");
  const [postcode, setPostcode] = useState("");
  const [notes, setNotes] = useState("");
  const [payMethod, setPayMethod] = useState<CartPaymentMethod>("card");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Returned from the payment provider without paying.
  useEffect(() => {
    const outcome = searchParams.get("payment");
    if (outcome === "cancelled") {
      toast.info("Payment cancelled — your cart is still here.");
    } else if (outcome === "failed") {
      toast.error("That payment didn't go through. Your cart is still here, so you can try another way to pay.");
    }
  }, [searchParams]);

  useEffect(() => {
    const prefs = readPrefs();
    if (prefs.fulfilment) setFulfilment(prefs.fulfilment);
    fetchWarehouses()
      .then((ws) => {
        setWarehouses(ws);
        const saved = ws.find((w) => w.id === prefs.warehouseId);
        if (saved) {
          setWarehouseId(saved.id);
          warehouseChosenByUser.current = true;
        } else if (ws[0]) setWarehouseId(ws[0].id);
      })
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Could not load warehouses"));
    fetchBuyerSession()
      .then((s) => {
        setSession(s);
        if (s) {
          setContactName([s.user.firstName, s.user.lastName].filter(Boolean).join(" "));
          setContactEmail(s.user.email ?? "");
          setContactPhone(s.user.phone ?? "");
        }
      })
      .catch(() => setSession(null));
  }, []);

  useEffect(() => {
    writePrefs({ warehouseId: warehouseId || undefined, fulfilment });
  }, [warehouseId, fulfilment]);

  // Delivery state picks the nearest warehouse until the buyer picks one themselves.
  useEffect(() => {
    if (fulfilment !== "DELIVERY" || warehouseChosenByUser.current) return;
    const w = nearestWarehouse(warehouses, state || null);
    if (w) setWarehouseId(w.id);
  }, [state, fulfilment, warehouses]);

  const linesKey = lines.map((l) => `${l.productId}:${l.quantity}`).join(",");
  useEffect(() => {
    if (!lines.length) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoteError(null);
    quoteCart(lines, { warehouseId: warehouseId || undefined, fulfilment })
      .then((q) => {
        if (cancelled) return;
        setQuote(q);
        cart.refresh(q.lines.map((l) => ({ productId: l.productId, price: l.unitPrice, name: l.name, imageUrl: l.imageUrl })));
      })
      .catch((e: unknown) => !cancelled && setQuoteError(e instanceof Error ? e.message : "Could not price your cart"));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on cart contents
  }, [linesKey, warehouseId, fulfilment]);

  // Afterpay and Zip are consumer credit, so installer accounts pay by card.
  const isCustomer = session?.portal !== "installer";
  const afterpayOption = isCustomer ? quote?.paymentOptions?.afterpay : undefined;
  const zipOption = isCustomer ? quote?.paymentOptions?.zip : undefined;
  const methodAvailable =
    payMethod === "card" || (payMethod === "afterpay" ? afterpayOption?.available : zipOption?.available);
  // A changed cart can move the total outside a provider's range.
  const activeMethod: CartPaymentMethod = methodAvailable ? payMethod : "card";
  const zipChosen = activeMethod === "zip";
  const needsAddress = fulfilment === "DELIVERY" || zipChosen;
  const payOptions: { id: CartPaymentMethod; title: string; sub: string }[] = [
    { id: "card", title: "Card", sub: "Pay in full by card" },
    ...(afterpayOption?.available ? [{ id: "afterpay" as const, title: "Afterpay", sub: `Pay in 4 instalments · ${money(afterpayOption.total)} total` }] : []),
    ...(zipOption?.available ? [{ id: "zip" as const, title: "Zip", sub: `Interest-free terms · ${money(zipOption.total)} total` }] : []),
  ];
  const activeOption = activeMethod === "afterpay" ? afterpayOption : activeMethod === "zip" ? zipOption : undefined;
  const payable = activeOption ?? quote;
  const payableTotal = payable?.total ?? 0;
  const providerName = activeMethod === "afterpay" ? "Afterpay" : activeMethod === "zip" ? "Zip" : "Stripe";

  const selected = warehouses.find((w) => w.id === warehouseId);
  const suggested = fulfilment === "DELIVERY" ? nearestWarehouse(warehouses, state || null) : undefined;
  const unavailable = useMemo(() => new Set(quote?.unavailable ?? []), [quote]);
  const quotedById = useMemo(() => new Map((quote?.lines ?? []).map((l) => [l.productId, l])), [quote]);
  const saleById = useMemo(() => new Map((activeOption?.lines ?? []).map((l) => [l.productId, l])), [activeOption]);
  const anyEstimate = quote?.lines.some((l) => l.priceEstimate) ?? false;
  const fulfilmentAvailable = selected
    ? fulfilment === "PICKUP"
      ? selected.pickupEnabled
      : selected.deliveryEnabled
    : false;

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!contactName.trim()) e.contactName = "Enter your name";
    if (!/^\S+@\S+\.\S+$/.test(contactEmail.trim())) e.contactEmail = "Enter a valid email";
    if (zipChosen && !contactPhone.trim()) e.contactPhone = "Zip needs your mobile number";
    if (needsAddress) {
      if (!addressLine1.trim()) e.addressLine1 = "Enter the street address";
      if (!suburb.trim()) e.suburb = "Enter the suburb";
      if (!state) e.state = "Choose a state";
      if (!/^\d{4}$/.test(postcode.trim())) e.postcode = "4-digit postcode";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handlePay() {
    if (!session || !selected) return;
    if (!validate()) {
      toast.error("Please check the highlighted fields.");
      return;
    }
    if (unavailable.size) {
      toast.error("Remove the unavailable products first.");
      return;
    }
    setSubmitting(true);
    try {
      const { checkoutUrl } = await startCheckout(session.portal, lines, {
        warehouseId: selected.id,
        fulfilment,
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim() || undefined,
        paymentMethod: activeMethod,
        ...(needsAddress
          ? {
              addressLine1: addressLine1.trim(),
              addressLine2: addressLine2.trim() || undefined,
              suburb: suburb.trim(),
              state: state || undefined,
              postcode: postcode.trim(),
            }
          : {}),
        notes: notes.trim() || undefined,
      });
      toast.info(`Redirecting to ${providerName}…`);
      window.location.assign(checkoutUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
      setSubmitting(false);
    }
  }

  if (!lines.length) {
    return (
      <div className="mx-auto flex max-w-[640px] flex-col items-center gap-4 px-4 py-24 text-center">
        <Icon name="ProductCart" className="size-12 text-warm-gray/60" />
        <h1 className="font-inter text-[24px] font-bold text-warm-ink">Your cart is empty</h1>
        <p className="font-dm-sans text-[14px] text-warm-gray">
          Add panels, inverters, batteries and more from the product catalogue.
        </p>
        <Link
          href="/products"
          className="rounded-xl px-6 py-3 font-inter text-[14px] font-semibold text-white"
          style={{ backgroundImage: GRADIENT }}
        >
          Browse products
        </Link>
      </div>
    );
  }

  const fromCart = encodeURIComponent("/cart");

  return (
    <div className="mx-auto grid w-full max-w-[1200px] gap-6 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex min-w-0 flex-col gap-5">
        <div>
          <h1 className="font-inter text-[26px] font-extrabold text-warm-ink">Cart &amp; checkout</h1>
          <p className="font-dm-sans text-[13px] text-warm-gray">
            {lines.length} product{lines.length === 1 ? "" : "s"} · prices include GST
          </p>
        </div>

        <Section step={1} title="Your products">
          <ul className="divide-y divide-warm-border">
            {lines.map((l) => {
              const q = quotedById.get(l.productId);
              const gone = unavailable.has(l.productId);
              return (
                <li key={l.productId} className="flex flex-wrap items-center gap-3 py-3 sm:flex-nowrap">
                  <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-cream-50">
                    {l.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- compressed library thumbnail
                      <img src={l.imageUrl} alt="" className="h-full w-full object-contain p-1.5" />
                    ) : (
                      <Icon name="ProductCart" className="size-6 text-warm-gray/50" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {l.brand ? (
                      <p className="font-dm-sans text-[10px] font-semibold uppercase tracking-[0.06em] text-warm-gray">{l.brand}</p>
                    ) : null}
                    <p className="font-inter text-[14px] font-semibold leading-[19px] text-warm-ink">{q?.name ?? l.name}</p>
                    <p className="font-dm-sans text-[12px] text-warm-gray">
                      {gone ? (
                        <span className="font-semibold text-danger">No longer available — remove to continue</span>
                      ) : q ? (
                        <>
                          {money(saleById.get(l.productId)?.unitPrice ?? q.unitPrice)} each
                          {q.priceEstimate ? " · indicative price" : ""}
                        </>
                      ) : (
                        "Pricing…"
                      )}
                    </p>
                  </div>
                  <QuantityStepper value={l.quantity} onChange={(n) => cart.setQuantity(l.productId, n)} label={l.name} />
                  <p className="w-24 text-right font-inter text-[15px] font-bold text-warm-ink">
                    {q ? money(saleById.get(l.productId)?.lineTotal ?? q.lineTotal) : "—"}
                  </p>
                  <button
                    type="button"
                    onClick={() => cart.remove(l.productId)}
                    className="font-dm-sans text-[12px] text-warm-gray hover:text-danger"
                    aria-label={`Remove ${l.name}`}
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
          <Link href="/products" className="mt-3 inline-block font-dm-sans text-[13px] font-semibold text-brand-blue hover:underline">
            + Add more products
          </Link>
        </Section>

        <Section step={2} title="Pickup or delivery">
          <div role="radiogroup" aria-label="Fulfilment" className="mb-4 grid grid-cols-2 gap-2">
            {(
              [
                ["PICKUP", "Pick up", "Collect from a warehouse — free"],
                ["DELIVERY", "Deliver", "Delivered from the warehouse you choose"],
              ] as const
            ).map(([value, title, sub]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={fulfilment === value}
                onClick={() => setFulfilment(value)}
                className={`rounded-xl border p-3 text-left transition ${
                  fulfilment === value ? "border-brand-blue bg-sky-wash/40 ring-2 ring-brand-blue/30" : "border-warm-border hover:bg-cream-50"
                }`}
              >
                <span className="block font-inter text-[14px] font-bold text-warm-ink">{title}</span>
                <span className="block font-dm-sans text-[12px] text-warm-gray">{sub}</span>
              </button>
            ))}
          </div>

          {needsAddress ? (
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              {fulfilment === "PICKUP" ? (
                <p className="font-dm-sans text-[12px] text-warm-gray sm:col-span-2">Zip needs your billing address, even for a pickup.</p>
              ) : null}
              <div className="sm:col-span-2">
                <label className={LABEL} htmlFor="co-line1">{fulfilment === "PICKUP" ? "Billing address" : "Street address"}</label>
                <input id="co-line1" className={INPUT} value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} autoComplete="address-line1" />
                {errors.addressLine1 ? <p className="mt-1 text-[11px] text-danger">{errors.addressLine1}</p> : null}
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL} htmlFor="co-line2">Unit, level, building (optional)</label>
                <input id="co-line2" className={INPUT} value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} autoComplete="address-line2" />
              </div>
              <div>
                <label className={LABEL} htmlFor="co-suburb">Suburb</label>
                <input id="co-suburb" className={INPUT} value={suburb} onChange={(e) => setSuburb(e.target.value)} autoComplete="address-level2" />
                {errors.suburb ? <p className="mt-1 text-[11px] text-danger">{errors.suburb}</p> : null}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL} htmlFor="co-state">State</label>
                  <select id="co-state" className={INPUT} value={state} onChange={(e) => setState(e.target.value as AuState)} autoComplete="address-level1">
                    <option value="">—</option>
                    {AU_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {errors.state ? <p className="mt-1 text-[11px] text-danger">{errors.state}</p> : null}
                </div>
                <div>
                  <label className={LABEL} htmlFor="co-postcode">Postcode</label>
                  <input id="co-postcode" className={INPUT} value={postcode} inputMode="numeric" maxLength={4} onChange={(e) => setPostcode(e.target.value.replace(/\D/g, ""))} autoComplete="postal-code" />
                  {errors.postcode ? <p className="mt-1 text-[11px] text-danger">{errors.postcode}</p> : null}
                </div>
              </div>
            </div>
          ) : null}

          <p className="mb-2 font-dm-sans text-[12px] font-semibold text-warm-ink">
            {fulfilment === "PICKUP" ? "Pick up from" : "Dispatch from"}
          </p>
          <div role="radiogroup" aria-label="Warehouse" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {warehouses.map((w) => {
              const enabled = fulfilment === "PICKUP" ? w.pickupEnabled : w.deliveryEnabled;
              const active = w.id === warehouseId;
              return (
                <button
                  key={w.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={!enabled}
                  onClick={() => {
                    warehouseChosenByUser.current = true;
                    setWarehouseId(w.id);
                  }}
                  className={`relative rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    active ? "border-brand-blue bg-sky-wash/40 ring-2 ring-brand-blue/30" : "border-warm-border hover:bg-cream-50"
                  }`}
                >
                  {suggested?.id === w.id ? (
                    <span className="absolute right-2 top-2 rounded-full bg-mint-soft px-2 py-0.5 font-dm-sans text-[9px] font-bold uppercase text-success">
                      Nearest
                    </span>
                  ) : null}
                  <span className="block font-inter text-[14px] font-bold text-warm-ink">{w.city}</span>
                  <span className="block font-dm-sans text-[11px] text-warm-gray">
                    {w.state}
                    {fulfilment === "PICKUP" && w.address ? ` · ${w.address}` : ""}
                  </span>
                  <span className="mt-1 block font-dm-sans text-[11px] font-semibold text-warm-ink/80">
                    {!enabled
                      ? fulfilment === "PICKUP"
                        ? "Pickup unavailable"
                        : "Delivery unavailable"
                      : fulfilment === "PICKUP"
                        ? w.pickupHours || "Free pickup"
                        : w.deliveryFee > 0
                          ? `Delivery ${money(w.deliveryFee)}`
                          : "Delivery included"}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section step={3} title="Contact details">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL} htmlFor="co-name">Full name</label>
              <input id="co-name" className={INPUT} value={contactName} onChange={(e) => setContactName(e.target.value)} autoComplete="name" />
              {errors.contactName ? <p className="mt-1 text-[11px] text-danger">{errors.contactName}</p> : null}
            </div>
            <div>
              <label className={LABEL} htmlFor="co-phone">Mobile{zipChosen ? "" : " (optional)"}</label>
              <input id="co-phone" className={INPUT} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} autoComplete="tel" inputMode="tel" />
              {errors.contactPhone ? <p className="mt-1 text-[11px] text-danger">{errors.contactPhone}</p> : null}
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL} htmlFor="co-email">Email for the receipt</label>
              <input id="co-email" type="email" className={INPUT} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} autoComplete="email" />
              {errors.contactEmail ? <p className="mt-1 text-[11px] text-danger">{errors.contactEmail}</p> : null}
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL} htmlFor="co-notes">Notes for the warehouse (optional)</label>
              <textarea
                id="co-notes"
                rows={2}
                maxLength={1000}
                className={`${INPUT} h-auto py-2`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Site access, preferred pickup time, job reference…"
              />
            </div>
          </div>
        </Section>

        <Section step={4} title="Payment method">
          <div role="radiogroup" aria-label="Payment method" className="grid gap-2 sm:grid-cols-3">
            {payOptions.map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={activeMethod === o.id}
                onClick={() => setPayMethod(o.id)}
                className={`rounded-xl border p-3 text-left transition ${
                  activeMethod === o.id ? "border-brand-blue bg-sky-wash/40 ring-2 ring-brand-blue/30" : "border-warm-border hover:bg-cream-50"
                }`}
              >
                <span className="block font-inter text-[14px] font-bold text-warm-ink">{o.title}</span>
                <span className="block font-dm-sans text-[12px] text-warm-gray">{o.sub}</span>
              </button>
            ))}
          </div>
          {!isCustomer ? (
            <p className="mt-2 font-dm-sans text-[12px] text-warm-gray">Installer accounts pay by card.</p>
          ) : payOptions.length < 3 && quote?.paymentOptions ? (
            <p className="mt-2 font-dm-sans text-[12px] text-warm-gray">
              Available options depend on your order total.
            </p>
          ) : null}
          {activeMethod !== "card" ? (
            <p className="mt-2 font-dm-sans text-[12px] leading-[17px] text-warm-gray">
              {activeOption && quote && activeOption.total !== quote.total ? `These are our ${providerName} prices, which differ from our card prices. ` : ""}
              {providerName} checks your eligibility and sets your repayments. Fees and T&amp;Cs apply. Your order is confirmed once {providerName} approves it.
            </p>
          ) : null}
        </Section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-warm-border bg-white p-5 shadow-sm">
          <h2 className="font-inter text-[16px] font-bold text-warm-ink">Order summary</h2>
          <dl className="mt-4 space-y-2 font-dm-sans text-[13px]">
            <div className="flex justify-between">
              <dt className="text-warm-gray">Subtotal</dt>
              <dd className="font-semibold text-warm-ink">{payable ? money(payable.subtotal) : "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-warm-gray">
                {fulfilment === "PICKUP" ? "Pickup" : "Delivery"}
                {selected ? ` · ${selected.city}` : ""}
              </dt>
              <dd className="font-semibold text-warm-ink">
                {!payable ? "—" : payable.deliveryFee > 0 ? money(payable.deliveryFee) : fulfilment === "PICKUP" ? "Free" : "Included"}
              </dd>
            </div>
            <div className="flex justify-between border-t border-warm-border pt-3">
              <dt className="font-inter text-[15px] font-bold text-warm-ink">Total (incl. GST)</dt>
              <dd className="font-inter text-[20px] font-bold text-warm-ink">{quote ? money(payableTotal) : "—"}</dd>
            </div>
          </dl>
          {quoteError ? <p className="mt-2 text-[12px] text-danger">{quoteError}</p> : null}
          {anyEstimate ? (
            <p className="mt-2 font-dm-sans text-[11px] leading-[15px] text-warm-gray">
              Some items show an indicative price. Our team confirms stock and pricing before dispatch.
            </p>
          ) : null}

          <div className="mt-5">
            {session === undefined ? (
              <p className="font-dm-sans text-[13px] text-warm-gray">Checking your account…</p>
            ) : session ? (
              <>
                <p className="mb-2 font-dm-sans text-[12px] text-warm-gray">
                  Ordering as <span className="font-semibold text-warm-ink">{contactName || session.user.email}</span>{" "}
                  ({session.portal === "installer" ? "installer account" : "customer account"})
                </p>
                <button
                  type="button"
                  onClick={() => void handlePay()}
                  disabled={submitting || !quote || !selected || !fulfilmentAvailable || unavailable.size > 0}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl font-inter text-[15px] font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ backgroundImage: GRADIENT }}
                >
                  {submitting ? (
                    <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : null}
                  {!quote ? "Pay" : activeMethod === "card" ? `Pay ${money(quote.total)}` : `Continue to ${providerName}`}
                </button>
                <p className="mt-2 text-center font-dm-sans text-[11px] text-warm-gray">
                  Secure payment by {providerName}. You&apos;ll get an email confirmation.
                </p>
                <p className="mt-1 text-center font-dm-sans text-[11px] text-warm-gray">
                  By paying you agree to our{" "}
                  <Link href="/terms" target="_blank" className="underline">terms</Link> and{" "}
                  <Link href="/refunds" target="_blank" className="underline">refunds policy</Link>.
                </p>
              </>
            ) : (
              <>
                <p className="mb-3 font-dm-sans text-[13px] text-warm-ink">
                  Sign in to place your order. Your cart is saved.
                </p>
                <div className="grid gap-2">
                  <Link
                    href={`/customers/auth?from=${fromCart}`}
                    className="flex h-11 items-center justify-center rounded-xl font-inter text-[14px] font-semibold text-white"
                    style={{ backgroundImage: GRADIENT }}
                  >
                    Sign in or create an account
                  </Link>
                  <Link
                    href={`/installers/auth?from=${fromCart}`}
                    className="flex h-11 items-center justify-center rounded-xl border border-warm-border font-inter text-[14px] font-semibold text-warm-ink hover:bg-cream-50"
                  >
                    Installer sign in
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
