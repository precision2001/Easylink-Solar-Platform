"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAllActiveProductRows, type PublicProductRow } from "@/lib/public/products";
import { productImage } from "@/lib/designs/product-specs";

/**
 * Place order. Products come from the live EasyLink catalogue (every active
 * product, with its library photo). Prices are the catalogue's sell prices —
 * estimates until supplier price lists are loaded, and labelled as such —
 * and stock isn't connected to the distributors yet. Racking and BOS kits
 * aren't catalogued, so those stay as sample lines. Cart math is real.
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
  imageUrl?: string;
  /** Price is a catalogue estimate, not a supplier price. */
  estimate?: boolean;
};

const CATEGORIES = [
  "All",
  "Panels",
  "Inverters",
  "Batteries",
  "EV chargers",
  "Heat pumps",
  "Portable power",
  "Racking & BOS",
] as const;

const KIND_BY_CATEGORY: Record<(typeof CATEGORIES)[number], string | null> = {
  All: null,
  Panels: "Panel",
  Inverters: "Inverter",
  Batteries: "Battery",
  "EV chargers": "EV charger",
  "Heat pumps": "Heat pump",
  "Portable power": "Portable power",
  "Racking & BOS": "Racking",
};

const KIND_BY_BACKEND: Record<string, string> = {
  "Solar Panel": "Panel",
  Inverter: "Inverter",
  Battery: "Battery",
  "EV Charger": "EV charger",
  "Heat Pump": "Heat pump",
  "Portable Power": "Portable power",
};

const GREY = "#5B6B80";

function specLine(row: PublicProductRow): string {
  const s = (row.specs ?? {}) as Record<string, unknown>;
  const n = (k: string) => (typeof s[k] === "number" ? (s[k] as number) : undefined);
  const parts: string[] = [];
  if (row.category === "Solar Panel" && row.wattage) parts.push(`${row.wattage} W`);
  else if (n("ratedKw")) parts.push(`${n("ratedKw")} kW`);
  if (n("usableCapacityKwh")) parts.push(`${n("usableCapacityKwh")} kWh`);
  if (n("capacityL")) parts.push(`${n("capacityL")} L`);
  if (s.cecApproved === true) parts.push("CEC listed");
  return parts.join(" · ") || row.category;
}

function toOrderProduct(row: PublicProductRow): Product {
  return {
    kind: KIND_BY_BACKEND[row.category] ?? row.category,
    name: [row.brand?.trim(), row.name].filter(Boolean).join(" "),
    sku: row.sku || row.id,
    spec: specLine(row),
    price: row.retailPrice ?? row.basePrice ?? 0,
    rrp: row.retailPrice ?? row.basePrice ?? 0,
    stock: "Stock not connected yet",
    stockColor: GREY,
    defaultQty: row.category === "Solar Panel" ? 20 : 1,
    imageUrl: productImage(row)?.thumbUrl,
    estimate: ((row.specs ?? {}) as Record<string, unknown>).priceEstimate === true,
  };
}


/** Racking and BOS kits aren't in the product catalogue yet; sample lines. */
const SAMPLE_EXTRAS: Product[] = [
  { kind: "Racking", name: "Racking kit · tile roof", sku: "RCK-T24", spec: "24 panels · AS/NZS 1170 · sample line", price: 1190.99, rrp: 1390.0, stock: "Sample line", stockColor: GREY, defaultQty: 1 },
];

const INITIAL_CART: Record<string, number> = {};

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
  const [catalogue, setCatalogue] = useState<Product[]>(SAMPLE_EXTRAS);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [search, setSearch] = useState("");
  const [qtyDraft, setQtyDraft] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    fetchAllActiveProductRows()
      .then((rows) => {
        if (cancelled) return;
        setCatalogue([...rows.map(toOrderProduct), ...SAMPLE_EXTRAS]);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [delivery, setDelivery] = useState<DeliveryOption>("site");
  const [poReference, setPoReference] = useState("PO 7790 · Rouse Hill");
  const [preferredDate, setPreferredDate] = useState("Thu 16 Oct 2026");
  const [agreed, setAgreed] = useState(true);

  const filteredProducts = useMemo(() => {
    const kind = KIND_BY_CATEGORY[category];
    const q = search.trim().toLowerCase();
    return catalogue
      .filter((p) => kind === null || p.kind === kind)
      .filter((p) => !q || `${p.name} ${p.sku} ${p.spec}`.toLowerCase().includes(q));
  }, [category, catalogue, search]);

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([sku, qty]) => {
          const product = catalogue.find((p) => p.sku === sku);
          return product ? { product, qty, total: product.price * qty } : null;
        })
        .filter((i): i is NonNullable<typeof i> => i !== null),
    [cart, catalogue],
  );

  const subtotal = cartItems.reduce((sum, i) => sum + i.total, 0);
  const deliveryCost = DELIVERY_COST[delivery];
  const gst = (subtotal + deliveryCost) * 0.1;
  const total = subtotal + deliveryCost + gst;

  const addToCart = (sku: string) => {
    const qty = Math.max(1, qtyDraft[sku] ?? catalogue.find((p) => p.sku === sku)?.defaultQty ?? 1);
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
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-[38px] w-[300px] max-w-full rounded-[10px] border border-[#CBD5E1] px-3 text-[13px] outline-none focus-visible:border-[#0B1A2E]"
        />
      </header>

      <div className="flex flex-wrap items-center gap-4 border-b border-[#E3E8EF] bg-white px-8 pt-[22px] pb-4">
        <div className="flex-grow">
          <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">Place order</h1>
          <p className="mt-1 text-[13px] text-[#5B6B80]">
            {loadState === "loading"
              ? "Loading the catalogue…"
              : loadState === "error"
                ? "Couldn't load the catalogue — showing sample lines only"
                : `${catalogue.length - SAMPLE_EXTRAS.length} catalogue products · prices are estimates until supplier price lists are loaded · stock not connected yet`}
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
                  <div className="flex h-[110px] items-center justify-center overflow-hidden rounded-[10px] bg-[#EEF2F6] text-[12px] text-[#5B6B80]">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- compressed library thumbnail
                      <img src={p.imageUrl} alt={p.name} loading="lazy" className="h-full w-auto max-w-[85%] object-contain p-2" />
                    ) : (
                      <>{p.kind}</>
                    )}
                  </div>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[14px] font-bold text-[#0F172A]">{p.name}</span>
                    <span className="text-[12px] text-[#5B6B80]">
                      {p.sku} · {p.spec}
                    </span>
                  </span>
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-[18px] font-bold text-[#0F172A]">{formatAud(p.price)}</span>
                    <span className="text-[12px] text-[#5B6B80]">{p.estimate ? "estimate" : "ex GST"}</span>
                    {p.rrp > p.price ? (
                      <span className="ml-auto text-[12px] text-[#5B6B80] line-through">{formatAud(p.rrp)}</span>
                    ) : null}
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
                      value={qtyDraft[p.sku] ?? p.defaultQty}
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
