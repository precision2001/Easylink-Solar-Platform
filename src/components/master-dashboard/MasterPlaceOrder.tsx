"use client";

import { useMemo, useState } from "react";

/**
 * Matches the Easylink Designer "Place order" mock exactly (categories,
 * products, prices, stock) — there's no real product/stock catalogue wired
 * to a distributor-ordering flow in this app yet, so the catalogue is
 * sample data, same convention as the Overview pages. Cart math (subtotal/
 * GST/delivery/total) and quantity/category controls are real client-side
 * logic, not fabricated — they just operate on the sample catalogue.
 */
type Product = {
  kind: string;
  name: string;
  sku: string;
  spec: string;
  price: number;
  rrp: number;
  stock: string;
  stockColor: string;
  defaultQty: number;
};

const CATEGORIES = [
  "All",
  "Panels",
  "Inverters",
  "Batteries",
  "Portable power (BLUETTI)",
  "Racking & BOS",
  "EV chargers",
] as const;

const KIND_BY_CATEGORY: Record<(typeof CATEGORIES)[number], string | null> = {
  All: null,
  Panels: "Panel",
  Inverters: "Inverter",
  Batteries: "Battery",
  "Portable power (BLUETTI)": "Portable power",
  "Racking & BOS": "Racking",
  "EV chargers": "EV charger",
};

const OK = "#166534";
const LOW = "#92400E";
const OUT = "#991B1B";

const PRODUCTS: Product[] = [
  { kind: "Panel", name: "[Panel brand] 440 W N-type", sku: "PNL-440-NT", spec: "CEC listed · 30-yr warranty", price: 186.36, rrp: 219.0, stock: "In stock · Syd 1,240 · Bne 860", stockColor: OK, defaultQty: 24 },
  { kind: "Inverter", name: "[Inverter brand] 10 kW hybrid", sku: "INV-H10", spec: "Battery-ready · 3-phase option", price: 2954.55, rrp: 3390.0, stock: "In stock · Syd 34", stockColor: OK, defaultQty: 1 },
  { kind: "Battery", name: "[Battery brand] 13.5 kWh", sku: "BAT-135", spec: "VPP compatible", price: 8409.09, rrp: 9850.0, stock: "Low stock · Syd 6", stockColor: LOW, defaultQty: 1 },
  { kind: "Battery", name: "[Battery brand] 10 kWh stackable", sku: "BAT-100S", spec: "Modular 5 kWh blocks", price: 6120.0, rrp: 7200.0, stock: "Backorder · ETA 24 Oct", stockColor: OUT, defaultQty: 1 },
  { kind: "Portable power", name: "BLUETTI AC180", sku: "BLU-AC180", spec: "1,152 Wh · 1,800 W", price: 790.91, rrp: 999.0, stock: "In stock · Syd 52", stockColor: OK, defaultQty: 2 },
  { kind: "Portable power", name: "BLUETTI EP760 + B500", sku: "BLU-EP760", spec: "Home backup system", price: 5450.0, rrp: 6499.0, stock: "In stock · Syd 8", stockColor: OK, defaultQty: 1 },
  { kind: "Racking", name: "Racking kit · tile roof", sku: "RCK-T24", spec: "24 panels · AS/NZS 1170", price: 1190.99, rrp: 1390.0, stock: "In stock · Syd 41", stockColor: OK, defaultQty: 1 },
  { kind: "EV charger", name: "[EV brand] 7 kW smart charger", sku: "EVC-7S", spec: "Solar-aware charging", price: 945.45, rrp: 1190.0, stock: "In stock · Bne 19", stockColor: OK, defaultQty: 1 },
];

// Matches the mock's starting cart exactly.
const INITIAL_CART: Record<string, number> = {
  "PNL-440-NT": 24,
  "INV-H10": 1,
  "BAT-135": 1,
  "RCK-T24": 1,
};

type DeliveryOption = "site" | "warehouse" | "pickup";

const DELIVERY_COST: Record<DeliveryOption, number> = {
  site: 210,
  warehouse: 150,
  pickup: 0,
};

function formatAud(n: number): string {
  return `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function MasterPlaceOrder() {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [cart, setCart] = useState<Record<string, number>>(INITIAL_CART);
  const [qtyDraft, setQtyDraft] = useState<Record<string, number>>(
    Object.fromEntries(PRODUCTS.map((p) => [p.sku, p.defaultQty])),
  );
  const [delivery, setDelivery] = useState<DeliveryOption>("site");
  const [poReference, setPoReference] = useState("PO 7790 · Rouse Hill");
  const [preferredDate, setPreferredDate] = useState("Thu 16 Oct 2026");
  const [agreed, setAgreed] = useState(true);

  const filteredProducts = useMemo(() => {
    const kind = KIND_BY_CATEGORY[category];
    return kind === null ? PRODUCTS : PRODUCTS.filter((p) => p.kind === kind);
  }, [category]);

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([sku, qty]) => {
          const product = PRODUCTS.find((p) => p.sku === sku)!;
          return { product, qty, total: product.price * qty };
        }),
    [cart],
  );

  const subtotal = cartItems.reduce((sum, i) => sum + i.total, 0);
  const deliveryCost = DELIVERY_COST[delivery];
  const gst = (subtotal + deliveryCost) * 0.1;
  const total = subtotal + deliveryCost + gst;

  const addToCart = (sku: string) => {
    const qty = Math.max(1, qtyDraft[sku] ?? 1);
    setCart((prev) => ({ ...prev, [sku]: qty }));
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          Distributor Account <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Place order</span>
        </nav>
        <input
          type="search"
          aria-label="Search products"
          placeholder="Search SKU, brand, wattage…"
          className="h-[38px] w-[300px] max-w-full rounded-[10px] border border-[#CBD5E1] px-3 text-[13px] outline-none focus-visible:border-[#0B1A2E]"
        />
      </header>

      <div className="flex flex-wrap items-center gap-4 border-b border-[#E3E8EF] bg-white px-8 pt-[22px] pb-4">
        <div className="flex-grow">
          <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">Place order</h1>
          <p className="mt-1 text-[13px] text-[#5B6B80]">
            Gold partner pricing applied · live stock from Sydney and Brisbane warehouses
          </p>
        </div>
        <span
          title="Not built yet"
          className="flex h-11 cursor-not-allowed items-center rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-[14px] font-semibold text-[#94A3B8]"
        >
          Order from a solar design
        </span>
        <span
          title="Not built yet"
          className="flex h-11 cursor-not-allowed items-center rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-[14px] font-semibold text-[#94A3B8]"
        >
          Upload CSV of SKUs
        </span>
      </div>

      <div className="mx-auto flex w-full max-w-[1360px] flex-wrap items-start gap-4 px-8 py-6 pb-14">
        <section aria-label="Catalogue" className="flex min-w-0 flex-[3_1_560px] flex-col gap-3.5">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const on = category === c;
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setCategory(c)}
                  className="h-9 rounded-full px-3.5 text-[13px] font-semibold"
                  style={{
                    border: `1px solid ${on ? "#0B1A2E" : "#CBD5E1"}`,
                    background: on ? "#0B1A2E" : "#FFFFFF",
                    color: on ? "#FFFFFF" : "#334155",
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((p) => {
              const inCart = (cart[p.sku] ?? 0) > 0;
              return (
                <article
                  key={p.sku}
                  className="flex flex-col gap-2.5 rounded-[14px] border border-[#E3E8EF] bg-white p-3.5"
                >
                  <div className="flex h-[110px] items-center justify-center rounded-[10px] bg-[#EEF2F6] text-[12px] text-[#5B6B80]">
                    [{p.kind} image]
                  </div>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[14px] font-bold text-[#0F172A]">{p.name}</span>
                    <span className="text-[12px] text-[#5B6B80]">
                      {p.sku} · {p.spec}
                    </span>
                  </span>
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-[18px] font-bold text-[#0F172A]">{formatAud(p.price)}</span>
                    <span className="text-[12px] text-[#5B6B80]">ex GST</span>
                    <span className="ml-auto text-[12px] text-[#5B6B80] line-through">{formatAud(p.rrp)}</span>
                  </span>
                  <span className="text-[12px] font-semibold" style={{ color: p.stockColor }}>
                    {p.stock}
                  </span>
                  <div className="flex gap-2">
                    <label className="sr-only" htmlFor={`q-${p.sku}`}>
                      Quantity
                    </label>
                    <input
                      id={`q-${p.sku}`}
                      type="number"
                      min={1}
                      value={qtyDraft[p.sku] ?? 1}
                      onChange={(e) =>
                        setQtyDraft((prev) => ({ ...prev, [p.sku]: Number(e.target.value) || 1 }))
                      }
                      className="h-10 w-[70px] rounded-[9px] border border-[#CBD5E1] px-2 text-[14px] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => addToCart(p.sku)}
                      className="h-10 flex-grow rounded-[9px] bg-[#0B1A2E] text-[13px] font-semibold text-white"
                    >
                      {inCart ? "In cart · update" : "Add to cart"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside
          aria-label="Cart and checkout"
          className="flex min-w-0 flex-[1_1_340px] flex-col gap-3.5 rounded-[16px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <h2 className="m-0 text-[18px] font-bold text-[#0F172A]">
            Cart · {cartItems.length} item{cartItems.length === 1 ? "" : "s"}
          </h2>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {cartItems.length === 0 ? (
              <li className="text-[13px] text-[#5B6B80]">Your cart is empty.</li>
            ) : (
              cartItems.map(({ product, qty, total: lineTotal }) => (
                <li key={product.sku} className="flex items-start gap-2.5 text-[13px]">
                  <span className="flex flex-grow flex-col">
                    <span className="font-semibold text-[#0F172A]">{product.name}</span>
                    <span className="text-[#5B6B80]">
                      {qty} × {formatAud(product.price)}
                    </span>
                  </span>
                  <span className="font-semibold text-[#0F172A]">{formatAud(lineTotal)}</span>
                </li>
              ))
            )}
          </ul>

          <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#334155]">
            Your PO / job reference
            <input
              type="text"
              value={poReference}
              onChange={(e) => setPoReference(e.target.value)}
              className="h-10 rounded-[9px] border border-[#CBD5E1] px-2.5 text-[14px] font-normal outline-none"
            />
          </label>

          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-1.5 text-[12px] font-semibold text-[#334155]">Delivery</legend>
            {(
              [
                { id: "site" as const, title: "Deliver to site", desc: "22 Example Ave, Rouse Hill NSW · tail-lift · $210.00" },
                { id: "warehouse" as const, title: "Deliver to my warehouse", desc: "[Your warehouse address] · $150.00" },
                { id: "pickup" as const, title: "Pick up", desc: "EasyLink Sydney warehouse · free · ready in 24 h" },
              ]
            ).map((opt) => (
              <label
                key={opt.id}
                className="flex items-start gap-2 rounded-[10px] p-2.5 text-[13px]"
                style={{
                  border: delivery === opt.id ? "2px solid #F68A0A" : "1px solid #E3E8EF",
                  background: delivery === opt.id ? "#FFF7E6" : "transparent",
                }}
              >
                <input
                  type="radio"
                  name="del"
                  checked={delivery === opt.id}
                  onChange={() => setDelivery(opt.id)}
                  className="mt-0.5"
                />
                <span>
                  <strong>{opt.title}</strong>
                  <br />
                  <span className="text-[#475569]">{opt.desc}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#334155]">
            Preferred delivery date
            <input
              type="text"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              className="h-10 rounded-[9px] border border-[#CBD5E1] px-2.5 text-[14px] font-normal outline-none"
            />
          </label>

          <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
            <legend className="mb-1.5 text-[12px] font-semibold text-[#334155]">Payment</legend>
            <label className="flex items-center gap-2 text-[13px]">
              <input type="radio" name="pay" defaultChecked /> On account · 30-day terms ($31,760 available)
            </label>
            <label className="flex items-center gap-2 text-[13px]">
              <input type="radio" name="pay" /> Pay now · card, PayTo or bank transfer
            </label>
          </fieldset>

          <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 border-t border-[#EEF2F6] pt-3 text-[13px]">
            <dt className="text-[#5B6B80]">Subtotal ex GST</dt>
            <dd className="m-0 text-right">{formatAud(subtotal)}</dd>
            <dt className="text-[#5B6B80]">Delivery</dt>
            <dd className="m-0 text-right">{formatAud(deliveryCost)}</dd>
            <dt className="text-[#5B6B80]">GST 10%</dt>
            <dd className="m-0 text-right">{formatAud(gst)}</dd>
            <dt className="text-[15px] font-bold text-[#0F172A]">Total inc GST</dt>
            <dd className="m-0 text-right text-[18px] font-bold text-[#0F172A]">{formatAud(total)}</dd>
          </dl>

          <label className="flex items-start gap-2 text-[12px] text-[#475569]">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5"
            />
            I agree to the distributor terms of trade and warranty conditions
          </label>

          <span
            title="Not built yet — no real order gets placed"
            className="flex h-12 cursor-not-allowed items-center justify-center rounded-[12px] bg-[#F68A0A]/60 text-[15px] font-bold text-[#3B1D00]/70"
          >
            Place order · {formatAud(total)}
          </span>
          <span
            title="Not built yet"
            className="flex h-10 cursor-not-allowed items-center justify-center rounded-[10px] border border-[#CBD5E1] text-[13px] font-semibold text-[#94A3B8]"
          >
            Save as quote for customer
          </span>
        </aside>
      </div>
    </div>
  );
}
