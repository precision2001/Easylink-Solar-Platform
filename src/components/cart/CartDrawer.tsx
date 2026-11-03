"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import Icon from "@/components/ui/Icons";
import { cart, useCart } from "@/lib/cart/cart-store";
import { money, quoteCart } from "@/lib/cart/orders-api";
import { QuantityStepper } from "@/components/cart/QuantityStepper";

const GRADIENT = "linear-gradient(121.47deg, rgb(32, 148, 243) 0%, rgb(23, 207, 207) 100%)";

/**
 * Slide-over cart, mounted once in the root layout so the website and both
 * portals share it. Prices shown here are refreshed from the server each time
 * the drawer opens; the cart page prices again with the chosen warehouse.
 */
export function CartDrawer() {
  const { lines, drawerOpen, subtotal, count } = useCart();
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const linesKey = lines.map((l) => `${l.productId}:${l.quantity}`).join(",");

  // Close when navigating (e.g. "Checkout" → /cart).
  useEffect(() => {
    cart.close();
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cart.close();
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  // Re-price from the server whenever the open drawer's contents change.
  useEffect(() => {
    if (!drawerOpen || !linesKey) return;
    let cancelled = false;
    quoteCart(lines)
      .then((q) => {
        if (cancelled) return;
        cart.refresh(q.lines.map((l) => ({ productId: l.productId, price: l.unitPrice, name: l.name, imageUrl: l.imageUrl })));
        for (const id of q.unavailable) cart.remove(id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on contents, not identity
  }, [drawerOpen, linesKey]);

  if (pathname === "/cart") return null;

  return (
    <div
      className={`fixed inset-0 z-[60] ${drawerOpen ? "" : "pointer-events-none"}`}
      aria-hidden={!drawerOpen}
    >
      <div
        className={`absolute inset-0 bg-slate-950/40 transition-opacity ${drawerOpen ? "opacity-100" : "opacity-0"}`}
        onClick={() => cart.close()}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col bg-white shadow-2xl outline-none transition-transform duration-300 ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-warm-border px-5 py-4">
          <h2 className="font-inter text-[17px] font-bold text-warm-ink">
            Your cart{count ? <span className="ml-1.5 font-dm-sans text-[13px] font-medium text-warm-gray">({count})</span> : null}
          </h2>
          <button
            type="button"
            onClick={() => cart.close()}
            aria-label="Close cart"
            className="rounded-full p-2 text-warm-gray hover:bg-cream-50 hover:text-warm-ink"
          >
            <span aria-hidden className="block text-xl leading-none">×</span>
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
            <Icon name="ProductCart" className="size-10 text-warm-gray/60" />
            <p className="font-inter text-[15px] font-semibold text-warm-ink">Your cart is empty</p>
            <Link href="/products" className="font-dm-sans text-[13px] font-semibold text-brand-blue hover:underline">
              Browse products
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-warm-border overflow-y-auto px-5">
              {lines.map((l) => (
                <li key={l.productId} className="flex gap-3 py-4">
                  <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-cream-50">
                    {l.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- compressed library thumbnail
                      <img src={l.imageUrl} alt="" className="h-full w-full object-contain p-1.5" />
                    ) : (
                      <Icon name="ProductCart" className="size-6 text-warm-gray/50" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="min-w-0">
                      {l.brand ? (
                        <p className="truncate font-dm-sans text-[10px] font-semibold uppercase tracking-[0.06em] text-warm-gray">
                          {l.brand}
                        </p>
                      ) : null}
                      <p className="line-clamp-2 font-inter text-[13px] font-semibold leading-[18px] text-warm-ink">{l.name}</p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <QuantityStepper
                        value={l.quantity}
                        onChange={(q) => cart.setQuantity(l.productId, q)}
                        label={l.name}
                        size="sm"
                      />
                      <p className="font-inter text-[14px] font-bold text-warm-ink">
                        {l.price != null ? money(l.price * l.quantity) : "—"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => cart.remove(l.productId)}
                    aria-label={`Remove ${l.name}`}
                    className="self-start rounded p-1 font-dm-sans text-[11px] text-warm-gray hover:text-danger"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-warm-border px-5 py-4">
              <div className="flex items-baseline justify-between">
                <span className="font-dm-sans text-[13px] text-warm-gray">Subtotal (incl. GST)</span>
                <span className="font-inter text-[20px] font-bold text-warm-ink">{money(subtotal)}</span>
              </div>
              <p className="mt-1 font-dm-sans text-[11px] text-warm-gray">
                Choose pickup or delivery from Sydney, Melbourne, Brisbane, Adelaide or Perth at checkout.
              </p>
              <Link
                href="/cart"
                className="mt-3 flex h-11 w-full items-center justify-center rounded-xl font-inter text-[14px] font-semibold text-white shadow-sm"
                style={{ backgroundImage: GRADIENT }}
              >
                Checkout
              </Link>
              <button
                type="button"
                onClick={() => cart.close()}
                className="mt-2 w-full rounded-xl py-2 font-dm-sans text-[13px] font-semibold text-warm-ink hover:bg-cream-50"
              >
                Continue shopping
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
